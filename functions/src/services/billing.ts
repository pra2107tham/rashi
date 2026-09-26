import * as logger from "firebase-functions/logger";
import { PRODUCTS, type ProductType } from "../config";
import { sha256 } from "../lib/crypto";
import { denied, invalid, precondition } from "../lib/errors";
import { FieldValue, firestore, paths, Timestamp } from "../lib/firestore";
import { playApi, type SubscriptionPurchase } from "../lib/play";
import { loadEntitlements, publicEntitlements, type SubscriptionState } from "./entitlements";

/** Subscription states that grant access. On hold and paused states do not. */
const ENTITLED_SUB_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED", // cancelled but not yet expired: access continues until expiresAt
]);

/**
 * The value the app must pass to Play Billing as `obfuscatedAccountId`,
 * so a purchase token can't be redeemed by another account.
 */
export function obfuscatedAccountId(uid: string): string {
  return sha256("rashi-play", uid).slice(0, 64);
}

interface PurchaseDoc {
  uid: string | null;
  productId: string;
  type: ProductType;
  orderId: string | null;
  status: "granted" | "voided";
  acknowledged: boolean;
  grant: { credits?: number; readingId?: string };
}

export interface VerifyPurchaseInput {
  productId: string;
  purchaseToken: string;
  readingId?: string; // required for "unlock" products
}

function subscriptionState(productId: string, token: string, sub: SubscriptionPurchase): SubscriptionState {
  return {
    productId,
    purchaseToken: token,
    expiresAt: Timestamp.fromDate(sub.expiresAt ?? new Date(0)),
    state: sub.state,
  };
}

async function finalize(productId: string, type: ProductType, token: string): Promise<void> {
  const play = playApi();
  if (type === "credits") await play.consumeProduct(productId, token);
  else if (type === "unlock") await play.acknowledgeProduct(productId, token);
  else await play.acknowledgeSubscription(productId, token);
  await firestore().doc(paths.purchase(token)).update({ acknowledged: true });
}

/**
 * Checks a Play purchase with Google, then grants it once.
 * Idempotent on the purchase token: repeat calls return the current entitlements.
 */
export async function verifyPurchase(uid: string, input: VerifyPurchaseInput) {
  const product = PRODUCTS[input.productId];
  if (!product) throw invalid(`Unknown product ${input.productId}`);
  if (product.type === "unlock" && !input.readingId) throw invalid("readingId is required for an unlock");
  if (product.type === "unlock" && !input.readingId!.startsWith(`${uid}_`)) throw denied("That reading belongs to someone else");

  const db = firestore();
  const purchaseRef = db.doc(paths.purchase(input.purchaseToken));
  const entRef = db.doc(paths.entitlements(uid));
  const expectedAccount = obfuscatedAccountId(uid);

  const prior = (await purchaseRef.get()).data() as PurchaseDoc | undefined;
  if (prior && prior.uid !== uid) throw denied("This purchase belongs to another account");

  let grant: PurchaseDoc["grant"] = {};
  let orderId: string | null = null;
  let acknowledged = prior?.acknowledged ?? false;
  let sub: SubscriptionPurchase | null = null;

  if (!prior) {
    if (product.type === "subscription") {
      sub = await playApi().getSubscription(input.purchaseToken);
      if (sub.productId !== input.productId) throw invalid("Purchase does not match product");
      if (!ENTITLED_SUB_STATES.has(sub.state) || !sub.expiresAt || sub.expiresAt <= new Date()) {
        throw precondition(`Subscription is not active (${sub.state})`);
      }
      if (sub.obfuscatedAccountId && sub.obfuscatedAccountId !== expectedAccount) throw denied("Purchase account mismatch");
      orderId = sub.orderId;
      acknowledged = sub.acknowledged;
    } else {
      const p = await playApi().getProduct(input.productId, input.purchaseToken);
      if (p.purchaseState === 2) throw precondition("Payment is still pending");
      if (p.purchaseState !== 0) throw precondition("Purchase is not complete");
      if (p.consumed) throw precondition("Purchase was already used");
      if (p.obfuscatedAccountId && p.obfuscatedAccountId !== expectedAccount) throw denied("Purchase account mismatch");
      orderId = p.orderId;
      acknowledged = p.acknowledged;
    }
    grant = product.type === "credits" ? { credits: product.credits } : product.type === "unlock" ? { readingId: input.readingId } : {};

    await db.runTransaction(async (tx) => {
      const [again, entSnap] = await Promise.all([tx.get(purchaseRef), tx.get(entRef)]);
      if (again.exists) return; // a concurrent call already granted it
      const doc: PurchaseDoc = {
        uid, productId: input.productId, type: product.type, orderId, status: "granted", acknowledged: false, grant,
      };
      tx.set(purchaseRef, { ...doc, createdAt: FieldValue.serverTimestamp() });

      const update: Record<string, unknown> = {};
      if (grant.credits) update.chatCredits = FieldValue.increment(grant.credits);
      if (grant.readingId) update[`unlocks.${grant.readingId}`] = true;
      if (sub) update.subscription = subscriptionState(input.productId, input.purchaseToken, sub);
      if (entSnap.exists) tx.update(entRef, update);
      else tx.set(entRef, { chatCredits: 0, unlocks: {}, subscription: null, ...update }, { merge: true });
    });
    logger.info("billing.granted", { uid, productId: input.productId, orderId });
  }

  // Unacknowledged purchases are refunded by Play after 3 days, so retry on every call until it sticks.
  if (!acknowledged) {
    try {
      await finalize(input.productId, product.type, input.purchaseToken);
    } catch (err) {
      logger.error("billing.ack_failed", { uid, productId: input.productId, err: String(err) });
    }
  }

  return publicEntitlements(await loadEntitlements(uid));
}

// ---- Real-time developer notifications -------------------------------------------------------

export interface DeveloperNotification {
  packageName?: string;
  subscriptionNotification?: { notificationType: number; purchaseToken: string; subscriptionId: string };
  voidedPurchaseNotification?: { purchaseToken: string; orderId: string; productType: number };
  testNotification?: unknown;
}

/** Keeps subscription state in sync (renewals, cancellations, expiry, holds) and revokes refunds. */
export async function handleDeveloperNotification(msg: DeveloperNotification): Promise<void> {
  const db = firestore();

  if (msg.subscriptionNotification) {
    const { purchaseToken } = msg.subscriptionNotification;
    const purchase = (await db.doc(paths.purchase(purchaseToken)).get()).data() as PurchaseDoc | undefined;
    if (!purchase?.uid) {
      // Not verified yet; the app's verifyPurchase call will record it.
      logger.info("rtdn.unknown_token", { type: msg.subscriptionNotification.notificationType });
      return;
    }
    const sub = await playApi().getSubscription(purchaseToken);
    const active = ENTITLED_SUB_STATES.has(sub.state) && !!sub.expiresAt && sub.expiresAt > new Date();
    await db.doc(paths.entitlements(purchase.uid)).set(
      { subscription: active ? subscriptionState(purchase.productId, purchaseToken, sub) : null },
      { merge: true },
    );
    logger.info("rtdn.subscription", { uid: purchase.uid, state: sub.state });
    return;
  }

  if (msg.voidedPurchaseNotification) {
    const { purchaseToken } = msg.voidedPurchaseNotification;
    const purchaseRef = db.doc(paths.purchase(purchaseToken));
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(purchaseRef);
      const purchase = snap.data() as PurchaseDoc | undefined;
      if (!purchase || purchase.status === "voided") return;
      // Transactions need every read before the first write.
      const entRef = purchase.uid ? db.doc(paths.entitlements(purchase.uid)) : null;
      const ent = entRef ? await tx.get(entRef) : null;

      tx.update(purchaseRef, { status: "voided", voidedAt: FieldValue.serverTimestamp() });
      if (!entRef || !ent) return;
      const update: Record<string, unknown> = {};
      if (purchase.grant.credits) {
        update.chatCredits = Math.max(0, ((ent.get("chatCredits") as number) ?? 0) - purchase.grant.credits);
      }
      if (purchase.grant.readingId) update[`unlocks.${purchase.grant.readingId}`] = FieldValue.delete();
      if (purchase.type === "subscription" && ent.get("subscription.purchaseToken") === purchaseToken) {
        update.subscription = null;
      }
      if (Object.keys(update).length && ent.exists) tx.update(entRef, update);
    });
    logger.info("rtdn.voided", { orderId: msg.voidedPurchaseNotification.orderId });
  }
}
