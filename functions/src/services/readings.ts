import * as logger from "firebase-functions/logger";
import { describePlacement, transitMoon } from "../astro";
import { MODELS, type Period } from "../config";
import { generateJson } from "../lib/claude";
import { describePeriod, periodKey } from "../lib/dates";
import { unavailable } from "../lib/errors";
import { FieldValue, firestore, paths, Timestamp } from "../lib/firestore";
import {
  READING_PROMPT_VERSION, READING_SYSTEM, buildReadingPrompt, readingSchema, type ReadingContent,
} from "../prompts/reading";
import { canReadFull, loadEntitlements } from "./entitlements";
import { astroContext, loadProfile, type Profile } from "./profile";

const LOCK_TTL_MS = 60_000;
const WAIT_POLL_MS = 500;
const WAIT_MAX_MS = 25_000;

export interface ReadingDoc {
  uid: string;
  period: Period;
  periodKey: string;
  language: string;
  headline: string;
  teaser: string;
  mood: string;
  profileRev: number;
  promptVersion: string;
  model: string;
}

export interface ReadingResponse {
  id: string;
  period: Period;
  periodKey: string;
  headline: string;
  teaser: string;
  mood: string;
  locked: boolean;
  content: ReadingContent | null;
  cached: boolean;
}

export function readingId(uid: string, period: Period, key: string, language: string): string {
  return `${uid}_${period}_${key}_${language}`;
}

function isFresh(doc: ReadingDoc | undefined, profile: Profile): doc is ReadingDoc {
  return !!doc && doc.profileRev === profile.profileRev && doc.promptVersion === READING_PROMPT_VERSION;
}

async function generate(profile: Profile, period: Period, now: Date): Promise<ReadingContent> {
  const transit = describePlacement(transitMoon(now));
  return generateJson({
    label: `reading:${period}`,
    model: MODELS.reading,
    system: READING_SYSTEM,
    messages: [{
      role: "user",
      content: buildReadingPrompt({
        period,
        periodDescription: describePeriod(period, profile.tz, now),
        focusArea: profile.focusArea,
        language: profile.language,
        astro: astroContext(profile.chart),
        transit: {
          moonRashi: `${transit.rashi.name} (${transit.rashi.english})`,
          nakshatra: transit.nakshatra.name,
        },
      }),
    }],
    schema: readingSchema,
    maxTokens: 4000,
    effort: "low",
  });
}

/**
 * Try to take the generation lock. The reading is re-checked inside the same transaction, so a
 * request that raced past the first cache check can't regenerate a reading that just landed.
 */
async function acquireLock(id: string, profile: Profile, now: number): Promise<"acquired" | "busy" | "fresh"> {
  const db = firestore();
  const lockRef = db.doc(paths.lock(id));
  const readingRef = db.doc(paths.reading(id));
  return db.runTransaction(async (tx) => {
    const [lock, reading] = await Promise.all([tx.get(lockRef), tx.get(readingRef)]);
    if (isFresh(reading.data() as ReadingDoc | undefined, profile)) return "fresh";
    const heldUntil = lock.get("expiresAt") as Timestamp | undefined;
    if (heldUntil && heldUntil.toMillis() > now) return "busy";
    tx.set(lockRef, { expiresAt: Timestamp.fromMillis(now + LOCK_TTL_MS) });
    return "acquired";
  });
}

async function waitForReading(id: string, profile: Profile): Promise<ReadingDoc | null> {
  const ref = firestore().doc(paths.reading(id));
  const deadline = Date.now() + WAIT_MAX_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, WAIT_POLL_MS));
    const doc = (await ref.get()).data() as ReadingDoc | undefined;
    if (isFresh(doc, profile)) return doc;
  }
  return null;
}

/**
 * Cache-or-generate: one Claude call per user, period and language, reused on every later open.
 * A short-lived lock doc stops simultaneous opens from paying for the same reading twice.
 */
export async function ensureReading(
  uid: string, period: Period, now: Date = new Date(), profile?: Profile,
): Promise<{ id: string; doc: ReadingDoc; content: ReadingContent; cached: boolean }> {
  profile ??= await loadProfile(uid);
  const key = periodKey(period, profile.tz, now);
  const id = readingId(uid, period, key, profile.language);
  const db = firestore();
  const ref = db.doc(paths.reading(id));
  const fullRef = db.doc(paths.readingFull(id));

  const existing = (await ref.get()).data() as ReadingDoc | undefined;
  if (isFresh(existing, profile)) {
    const content = (await fullRef.get()).get("content") as ReadingContent;
    return { id, doc: existing, content, cached: true };
  }

  const lock = await acquireLock(id, profile, Date.now());
  if (lock !== "acquired") {
    const doc = lock === "fresh" ? ((await ref.get()).data() as ReadingDoc) : await waitForReading(id, profile);
    if (!doc) throw unavailable("Your reading is still being prepared — try again in a moment.");
    const content = (await fullRef.get()).get("content") as ReadingContent;
    return { id, doc, content, cached: true };
  }

  try {
    const content = await generate(profile, period, now);
    const doc: ReadingDoc = {
      uid,
      period,
      periodKey: key,
      language: profile.language,
      headline: content.headline,
      teaser: content.teaser,
      mood: content.mood,
      profileRev: profile.profileRev,
      promptVersion: READING_PROMPT_VERSION,
      model: MODELS.reading,
    };
    const batch = db.batch();
    batch.set(fullRef, { content });
    batch.set(ref, { ...doc, createdAt: FieldValue.serverTimestamp() });
    batch.delete(db.doc(paths.lock(id)));
    await batch.commit();
    return { id, doc, content, cached: false };
  } catch (err) {
    await db.doc(paths.lock(id)).delete().catch(() => undefined);
    logger.error("reading.generate_failed", { uid, period, err: String(err) });
    throw unavailable("We couldn't prepare your reading right now. Please try again.");
  }
}

export async function getReading(uid: string, period: Period, now: Date = new Date()): Promise<ReadingResponse> {
  const [reading, ent] = await Promise.all([ensureReading(uid, period, now), loadEntitlements(uid)]);
  const unlocked = canReadFull(ent, reading.id, period, now);
  return {
    id: reading.id,
    period,
    periodKey: reading.doc.periodKey,
    headline: reading.doc.headline,
    teaser: reading.doc.teaser,
    mood: reading.doc.mood,
    locked: !unlocked,
    content: unlocked ? reading.content : null,
    cached: reading.cached,
  };
}
