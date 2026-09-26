import { FREE_FULL_PERIODS, type Period } from "../config";
import { firestore, paths, Timestamp } from "../lib/firestore";

export interface SubscriptionState {
  productId: string;
  purchaseToken: string;
  expiresAt: Timestamp;
  state: string; // Play SubscriptionState, e.g. SUBSCRIPTION_STATE_ACTIVE
}

export interface Entitlements {
  chatCredits: number;
  unlocks: Record<string, boolean>;
  subscription: SubscriptionState | null;
}

const EMPTY: Entitlements = { chatCredits: 0, unlocks: {}, subscription: null };

export async function loadEntitlements(uid: string): Promise<Entitlements> {
  const snap = await firestore().doc(paths.entitlements(uid)).get();
  return snap.exists ? { ...EMPTY, ...(snap.data() as Partial<Entitlements>) } : EMPTY;
}

export function hasActiveSubscription(ent: Entitlements, now: Date = new Date()): boolean {
  return ent.subscription !== null && ent.subscription.expiresAt.toMillis() > now.getTime();
}

export function canReadFull(ent: Entitlements, readingId: string, period: Period, now: Date = new Date()): boolean {
  return FREE_FULL_PERIODS.includes(period) || hasActiveSubscription(ent, now) || ent.unlocks[readingId] === true;
}

export function publicEntitlements(ent: Entitlements, now: Date = new Date()) {
  return {
    chatCredits: ent.chatCredits,
    subscribed: hasActiveSubscription(ent, now),
    subscriptionExpiresAt: ent.subscription ? ent.subscription.expiresAt.toDate().toISOString() : null,
  };
}
