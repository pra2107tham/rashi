import { exhausted } from "./errors";
import { firestore, paths, Timestamp } from "./firestore";

const WINDOW_MS = 60_000;

/** Fixed one-minute window counter per uid and bucket. Throws resource-exhausted when over. */
export async function enforceRateLimit(uid: string, bucket: string, maxPerMinute: number, now = Date.now()): Promise<void> {
  const ref = firestore().doc(paths.rateLimit(`${uid}_${bucket}`));
  const allowed = await firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const windowStart = snap.get("windowStart") as Timestamp | undefined;
    const inWindow = windowStart && now - windowStart.toMillis() < WINDOW_MS;
    const count = inWindow ? (snap.get("count") as number) : 0;
    if (count >= maxPerMinute) return false;
    tx.set(ref, {
      windowStart: inWindow ? windowStart : Timestamp.fromMillis(now),
      count: count + 1,
      // TTL policy on this field lets Firestore clean up old counters.
      expireAt: Timestamp.fromMillis(now + 10 * WINDOW_MS),
    });
    return true;
  });
  if (!allowed) throw exhausted("Too many requests — please wait a minute.");
}
