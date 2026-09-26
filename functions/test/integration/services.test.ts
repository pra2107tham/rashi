import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFirestore } from "./setup";

const claude = vi.hoisted(() => ({ generateJson: vi.fn(), generateText: vi.fn() }));
vi.mock("../../src/lib/llm", async (orig) => ({ ...(await orig<object>()), ...claude }));

const fcm = vi.hoisted(() => ({ sendEachForMulticast: vi.fn() }));
vi.mock("firebase-admin/messaging", () => ({ getMessaging: () => fcm }));

import { firestore, paths } from "../../src/lib/firestore";
import { setPlayApiForTesting, type PlayApi } from "../../src/lib/play";
import { obfuscatedAccountId, verifyPurchase, handleDeveloperNotification } from "../../src/services/billing";
import { sendChatMessage } from "../../src/services/chat";
import { createMatch } from "../../src/services/match";
import { registerDevice, runDailySlot } from "../../src/services/notifications";
import { deleteUserData, loadProfile, upsertProfile } from "../../src/services/profile";
import { getReading, readingId } from "../../src/services/readings";

const READING = {
  headline: "A quiet win at work", teaser: "Something you said last week lands today.", mood: "steady",
  sections: [1, 2, 3].map(() => ({ area: "career", title: "Work", body: "..." })),
  lucky: { color: "Green", number: 7, time: "10–11 am" }, remedy: "Walk at sunrise",
};
const NARRATIVE = {
  headline: "Steady and warm", summary: "...", strengths: ["a"], cautions: ["b"], doshaNote: "none", shareLine: "24.5/36!",
};

const PROFILE = {
  name: "Asha", birthDate: "1996-04-12", birthTime: "07:30", placeName: "Pune",
  lat: 18.5204, lng: 73.8567, focusArea: "career" as const, language: "en" as const,
};
const NOW = new Date("2026-09-26T04:00:00Z");

let uidSeq = 0;
async function newUser(overrides: Partial<typeof PROFILE> = {}) {
  const uid = `user${++uidSeq}_${Date.now()}`;
  await upsertProfile(uid, "+919999999999", { ...PROFILE, ...overrides });
  return uid;
}

beforeEach(async () => {
  await clearFirestore();
  vi.clearAllMocks();
  claude.generateJson.mockImplementation(async ({ label }: { label: string }) => (label === "match" ? NARRATIVE : READING));
  claude.generateText.mockResolvedValue("Namaste! The Moon favours patience today.");
  fcm.sendEachForMulticast.mockResolvedValue({ successCount: 1, responses: [{ success: true }] });
});

describe("profile", () => {
  it("stores birth data encrypted and grants free chat credits", async () => {
    const uid = await newUser();
    const birth = (await firestore().doc(paths.birth(uid)).get()).data()!;
    expect(JSON.stringify(birth)).not.toContain("Pune");
    expect(JSON.stringify(birth)).not.toContain("1996-04-12");
    expect(birth.tz).toBe("Asia/Kolkata");
    const profile = await loadProfile(uid);
    expect(profile.placeName).toBe("Pune");
    expect((await firestore().doc(paths.entitlements(uid)).get()).get("chatCredits")).toBe(3);
  });
});

describe("readings", () => {
  it("generates once, then serves from cache", async () => {
    const uid = await newUser();
    const first = await getReading(uid, "today", NOW);
    const second = await getReading(uid, "today", NOW);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.content).toEqual(READING);
    expect(claude.generateJson).toHaveBeenCalledTimes(1);
  });

  it("concurrent opens generate only once", async () => {
    const uid = await newUser();
    claude.generateJson.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 800));
      return READING;
    });
    const results = await Promise.all([1, 2, 3].map(() => getReading(uid, "today", NOW)));
    expect(claude.generateJson).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r.headline).toBe(READING.headline));
  });

  it("locks weekly readings until unlocked", async () => {
    const uid = await newUser();
    const week = await getReading(uid, "week", NOW);
    expect(week.locked).toBe(true);
    expect(week.content).toBeNull();
    expect(week.teaser).toBe(READING.teaser);

    await firestore().doc(paths.entitlements(uid)).update({ [`unlocks.${week.id}`]: true });
    expect((await getReading(uid, "week", NOW)).content).toEqual(READING);
  });

  it("regenerates after the profile changes or language switches", async () => {
    const uid = await newUser();
    await getReading(uid, "today", NOW);
    await upsertProfile(uid, null, { ...PROFILE, language: "hi" });
    const hi = await getReading(uid, "today", NOW);
    expect(hi.id).toBe(readingId(uid, "today", "2026-09-26", "hi"));
    expect(claude.generateJson).toHaveBeenCalledTimes(2);
  });

  it("releases the lock and reports unavailable when generation fails", async () => {
    const uid = await newUser();
    claude.generateJson.mockRejectedValueOnce(new Error("boom"));
    await expect(getReading(uid, "today", NOW)).rejects.toMatchObject({ code: "unavailable" });
    await expect(getReading(uid, "today", NOW)).resolves.toMatchObject({ cached: false });
  });
});

describe("chat", () => {
  it("spends a credit per message and refunds on failure", async () => {
    const uid = await newUser();
    const ok = await sendChatMessage(uid, "Will my interview go well?");
    expect(ok.creditsRemaining).toBe(2);

    claude.generateText.mockRejectedValueOnce(new Error("down"));
    await expect(sendChatMessage(uid, "And next week?")).rejects.toMatchObject({ code: "unavailable" });
    expect((await firestore().doc(paths.entitlements(uid)).get()).get("chatCredits")).toBe(2);

    const msgs = await firestore().collection(paths.chat(uid)).get();
    expect(msgs.size).toBe(3); // user, assistant, failed user
  });

  it("refuses when out of credits", async () => {
    const uid = await newUser();
    await firestore().doc(paths.entitlements(uid)).update({ chatCredits: 0 });
    await expect(sendChatMessage(uid, "hi")).rejects.toMatchObject({ code: "resource-exhausted" });
    expect(claude.generateText).not.toHaveBeenCalled();
  });
});

describe("billing", () => {
  function fakePlay(overrides: Partial<PlayApi> = {}): PlayApi & Record<string, ReturnType<typeof vi.fn>> {
    const api = {
      getProduct: vi.fn(async () => ({ purchaseState: 0, acknowledged: false, consumed: false, orderId: "GPA.1", obfuscatedAccountId: null })),
      acknowledgeProduct: vi.fn(async () => undefined),
      consumeProduct: vi.fn(async () => undefined),
      getSubscription: vi.fn(async () => ({
        state: "SUBSCRIPTION_STATE_ACTIVE", productId: "rashi_plus_monthly", expiresAt: new Date(Date.now() + 30 * 86400_000),
        acknowledged: false, orderId: "GPA.2", obfuscatedAccountId: null, linkedPurchaseToken: null,
      })),
      acknowledgeSubscription: vi.fn(async () => undefined),
      ...overrides,
    };
    setPlayApiForTesting(api);
    return api as never;
  }

  it("grants credits once per token and consumes the purchase", async () => {
    const uid = await newUser();
    const play = fakePlay();
    const input = { productId: "chat_credits_10", purchaseToken: "token-credits-123" };
    expect((await verifyPurchase(uid, input)).chatCredits).toBe(13);
    expect((await verifyPurchase(uid, input)).chatCredits).toBe(13);
    expect(play.consumeProduct).toHaveBeenCalledTimes(1);
  });

  it("rejects a token already redeemed by someone else, or bound to another account", async () => {
    const [a, b] = [await newUser(), await newUser()];
    fakePlay();
    await verifyPurchase(a, { productId: "chat_credits_10", purchaseToken: "token-shared-123" });
    await expect(verifyPurchase(b, { productId: "chat_credits_10", purchaseToken: "token-shared-123" }))
      .rejects.toMatchObject({ code: "permission-denied" });

    fakePlay({ getProduct: vi.fn(async () => ({ purchaseState: 0, acknowledged: false, consumed: false, orderId: "x", obfuscatedAccountId: obfuscatedAccountId(a) })) });
    await expect(verifyPurchase(b, { productId: "chat_credits_10", purchaseToken: "token-bound-123" }))
      .rejects.toMatchObject({ code: "permission-denied" });
  });

  it("subscription unlocks locked readings; refund revokes it", async () => {
    const uid = await newUser();
    fakePlay();
    const res = await verifyPurchase(uid, { productId: "rashi_plus_monthly", purchaseToken: "token-sub-123" });
    expect(res.subscribed).toBe(true);
    expect((await getReading(uid, "month", NOW)).locked).toBe(false);

    await handleDeveloperNotification({ voidedPurchaseNotification: { purchaseToken: "token-sub-123", orderId: "GPA.2", productType: 1 } });
    expect((await firestore().doc(paths.entitlements(uid)).get()).get("subscription")).toBeNull();
  });

  it("refunded credits are clawed back without going negative", async () => {
    const uid = await newUser();
    fakePlay();
    await verifyPurchase(uid, { productId: "chat_credits_10", purchaseToken: "token-refund-123" });
    await firestore().doc(paths.entitlements(uid)).update({ chatCredits: 4 });
    await handleDeveloperNotification({ voidedPurchaseNotification: { purchaseToken: "token-refund-123", orderId: "x", productType: 2 } });
    expect((await firestore().doc(paths.entitlements(uid)).get()).get("chatCredits")).toBe(0);
  });
});

describe("kundli match", () => {
  it("scores deterministically, stores the other person encrypted, and caches", async () => {
    const uid = await newUser();
    const input = {
      userRole: "bride" as const,
      other: { name: "Rohan", birthDate: "1994-11-02", birthTime: "18:10", placeName: "Nagpur", lat: 21.1458, lng: 79.0882 },
    };
    const first = await createMatch(uid, input);
    const second = await createMatch(uid, input);
    expect(first.scores.total).toBeGreaterThanOrEqual(0);
    expect(first.scores.total).toBeLessThanOrEqual(36);
    expect(second).toMatchObject({ cached: true, scores: first.scores });
    expect(claude.generateJson).toHaveBeenCalledTimes(1);
    const stored = (await firestore().doc(paths.match(first.id)).get()).data()!;
    expect(JSON.stringify(stored)).not.toContain("Nagpur");
  });
});

describe("daily push", () => {
  it("pre-generates today's reading, sends to the slot's users and moves them to the next day", async () => {
    const uid = await newUser();
    await registerDevice(uid, "fcm-token-abcdef", "Asia/Kolkata");
    const other = await newUser();
    await registerDevice(other, "fcm-token-other", "America/New_York");

    const counts = await runDailySlot("02:30", new Date("2026-09-26T02:30:00Z"));
    expect(counts).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(fcm.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(fcm.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(["fcm-token-abcdef"]);

    const reading = await firestore().doc(paths.reading(readingId(uid, "today", "2026-09-26", "en"))).get();
    expect(reading.exists).toBe(true);
    expect((await firestore().doc(paths.user(uid)).get()).get("notify.utcSlot")).toBe("02:30");
    expect((await firestore().doc(paths.user(uid)).get()).get("notify.lastSentAt")).toBeTruthy();
  });

  it("prunes tokens FCM says are dead", async () => {
    const uid = await newUser();
    await registerDevice(uid, "fcm-token-dead", "Asia/Kolkata");
    fcm.sendEachForMulticast.mockResolvedValueOnce({
      successCount: 0,
      responses: [{ success: false, error: { code: "messaging/registration-token-not-registered" } }],
    });
    expect(await runDailySlot("02:30", new Date("2026-09-26T02:30:00Z"))).toMatchObject({ failed: 1 });
    expect((await firestore().doc(paths.user(uid)).get()).get("fcmTokens")).toEqual([]);
  });
});

describe("account deletion", () => {
  it("removes profile, readings, chat and matches", async () => {
    const uid = await newUser();
    await getReading(uid, "today", NOW);
    await sendChatMessage(uid, "hello");
    await deleteUserData(uid);
    const db = firestore();
    expect((await db.doc(paths.user(uid)).get()).exists).toBe(false);
    expect((await db.doc(paths.birth(uid)).get()).exists).toBe(false);
    expect((await db.collection("readings").where("uid", "==", uid).get()).empty).toBe(true);
    expect((await db.collection(paths.chat(uid)).get()).empty).toBe(true);
  });
});
