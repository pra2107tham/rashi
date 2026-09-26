import { getMessaging } from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import { LLM, MAX_FCM_TOKENS, type Language } from "../config";
import { generateText } from "../lib/llm";
import { isValidZone, utcSlotFor } from "../lib/dates";
import { invalid } from "../lib/errors";
import { FieldValue, firestore, paths } from "../lib/firestore";
import { NOTIFICATION_SYSTEM, NOTIFICATION_TITLE, buildNotificationPrompt } from "../prompts/notification";
import type { UserDoc } from "./profile";
import { ensureReading } from "./readings";

export async function registerDevice(uid: string, token: string, tz?: string): Promise<void> {
  if (tz && !isValidZone(tz)) throw invalid("Unknown timezone");
  const ref = firestore().doc(paths.user(uid));
  await firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw invalid("Create a profile before registering a device");
    const user = snap.data() as UserDoc;
    const tokens = [...user.fcmTokens.filter((t) => t !== token), token].slice(-MAX_FCM_TOKENS);
    const zone = tz ?? user.notify.tz;
    tx.update(ref, {
      fcmTokens: tokens,
      "notify.enabled": true,
      "notify.tz": zone,
      "notify.utcSlot": utcSlotFor(user.notify.localHour, zone),
    });
  });
}

export async function updateNotificationPrefs(uid: string, prefs: { enabled: boolean; localHour?: number }): Promise<void> {
  const ref = firestore().doc(paths.user(uid));
  await firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw invalid("Create a profile first");
    const user = snap.data() as UserDoc;
    const localHour = prefs.localHour ?? user.notify.localHour;
    tx.update(ref, {
      "notify.enabled": prefs.enabled,
      "notify.localHour": localHour,
      "notify.utcSlot": utcSlotFor(localHour, user.notify.tz),
    });
  });
}

async function notificationBody(headline: string, teaser: string, language: Language): Promise<string> {
  try {
    const text = await generateText({
      label: "notification",
      language,
      system: NOTIFICATION_SYSTEM,
      messages: [{ role: "user", content: buildNotificationPrompt(headline, teaser, language) }],
      maxTokens: LLM.maxTokens.notification,
    });
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  } catch (err) {
    logger.warn("notification.copy_fallback", { err: String(err) });
    return headline; // the reading headline is a fine hook on its own
  }
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** Pre-generates today's reading for one user, then pushes a hook to their devices. */
export async function sendDailyPush(uid: string, user: UserDoc, now: Date): Promise<"sent" | "skipped" | "failed"> {
  const userRef = firestore().doc(paths.user(uid));
  // Always move the user to their next slot, so DST changes are picked up and a failure doesn't cause a retry storm.
  const nextSlot = utcSlotFor(user.notify.localHour, user.notify.tz, new Date(now.getTime() + 60 * 60_000));
  try {
    if (user.fcmTokens.length === 0) return "skipped";
    const reading = await ensureReading(uid, "today", now);
    const body = await notificationBody(reading.doc.headline, reading.doc.teaser, user.language);

    const res = await getMessaging().sendEachForMulticast({
      tokens: user.fcmTokens,
      notification: { title: NOTIFICATION_TITLE[user.language], body },
      data: { type: "daily_reading", readingId: reading.id },
      android: { priority: "high", notification: { channelId: "daily_reading" } },
    });

    const stale = res.responses
      .map((r, i) => (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code) ? user.fcmTokens[i] : null))
      .filter((t): t is string => t !== null);
    if (stale.length) await userRef.update({ fcmTokens: FieldValue.arrayRemove(...stale) });
    return res.successCount > 0 ? "sent" : "failed";
  } catch (err) {
    logger.error("push.failed", { uid, err: String(err) });
    return "failed";
  } finally {
    await userRef.update({ "notify.utcSlot": nextSlot, "notify.lastSentAt": FieldValue.serverTimestamp() }).catch(() => undefined);
  }
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<unknown>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}

/** Runs the daily push for everyone whose local notification time falls in this 15-minute UTC slot. */
export async function runDailySlot(slot: string, now: Date, concurrency = 10) {
  const counts = { sent: 0, skipped: 0, failed: 0 };
  const PAGE = 200;
  let query = firestore()
    .collection("users")
    .where("notify.enabled", "==", true)
    .where("notify.utcSlot", "==", slot)
    .orderBy("__name__")
    .limit(PAGE);

  // Each processed user moves to a new slot, so pages are fetched before processing them.
  for (;;) {
    const page = await query.get();
    if (page.empty) break;
    await mapWithConcurrency(page.docs, concurrency, async (doc) => {
      counts[await sendDailyPush(doc.id, doc.data() as UserDoc, now)]++;
    });
    if (page.size < PAGE) break;
    query = query.startAfter(page.docs[page.docs.length - 1]);
  }
  logger.info("push.slot_done", { slot, ...counts });
  return counts;
}
