/**
 * Browser stand-in for firebase.ts with canned responses, used only to preview screens on web
 * (`npx expo start --web`). Never shipped in the Android app.
 */
import type { PhoneVerification } from "./firebase";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const reading = (period: string) => ({
  id: `demo_${period}`,
  period,
  periodKey: "2026-10-05",
  headline: period === "today" ? "Speak boldly, plan wisely" : period === "week" ? "This week, someone from your past resurfaces" : "A month of quiet, steady gains",
  teaser: period === "today"
    ? "Today favors quiet decisions over loud ones. A conversation you've been avoiding needs just five honest minutes."
    : "...with something unfinished. How you respond decides whether it becomes a door or a detour.",
  mood: "Determined",
  locked: period !== "today",
  cached: true,
  content: period === "today" ? {
    headline: "Speak boldly, plan wisely",
    teaser: "Today favors quiet decisions over loud ones.",
    mood: "Determined",
    sections: [
      { area: "career", title: "Your voice is your power", body: "The transit Moon sits in your 3rd house from your Makara rashi, lighting up courage and communication. Pitch the idea you have been holding back, but let your tone stay calm. A colleague may question you around midday; answer with facts, not volume." },
      { area: "love", title: "Choose your words kindly", body: "Your need to say everything is high today. Keep heavy conversations for another day and send one warm, honest message instead. Singles: a friend's introduction could surprise you." },
      { area: "money", title: "Small fixes, real control", body: "Skip impulsive buys today. Review one subscription you don't use and cancel it. A pending payment may arrive slowly, but it will arrive." },
    ],
    lucky: { color: "Sea green", number: 5, time: "6–7 PM" },
    remedy: "Offer a glass of water to a plant before your first tough conversation.",
  } : null,
});

const responses: Record<string, (data: any) => unknown> = {
  searchPlaces: ({ query }) => [
    { name: "Pune", region: "Maharashtra", country: "IN", lat: 18.52, lng: 73.86 },
    { name: "Puri", region: "Odisha", country: "IN", lat: 19.81, lng: 85.83 },
    { name: "Purnia", region: "Bihar", country: "IN", lat: 25.78, lng: 87.47 },
  ].filter((p) => p.name.toLowerCase().startsWith(String(query).toLowerCase().slice(0, 2))).length
    ? { places: [
      { name: "Pune", region: "Maharashtra", country: "IN", lat: 18.52, lng: 73.86 },
      { name: "Puri", region: "Odisha", country: "IN", lat: 19.81, lng: 85.83 },
      { name: "Purnia", region: "Bihar", country: "IN", lat: 25.78, lng: 87.47 },
    ] } : { places: [] },
  upsertProfile: () => ({ chart: {} }),
  getProfile: () => ({
    profile: {
      name: "Rohan", birthDate: "1998-08-14", birthTime: "07:30", placeName: "Pune", lat: 18.52, lng: 73.86,
      focusArea: "career", language: "hi",
      chart: {
        rashi: { index: 0, name: "Mesha", english: "Aries", hindi: "मेष", lord: "Mars" },
        nakshatra: { index: 0, name: "Ashwini", hindi: "अश्विनी", lord: "Ketu", pada: 2 },
        ascendant: null, timeKnown: true, nakshatraUncertain: false,
      },
    },
    entitlements: { chatCredits: 3, subscribed: false, subscriptionExpiresAt: null },
    playAccountId: "demo",
  }),
  getReading: ({ period }) => reading(period),
  createMatch: () => ({
    id: "demo", cached: false, otherName: "Ananya",
    you: { rashi: "Mesha (Aries)", nakshatra: "Ashwini" }, them: { rashi: "Tula (Libra)", nakshatra: "Chitra" },
    scores: { varna: 1, vashya: 2, tara: 3, yoni: 4, grahaMaitri: 4, gana: 6, bhakoot: 0, nadi: 8, total: 28 },
    doshas: { nadi: false, bhakoot: true, manglik: { you: { isManglik: false }, them: { isManglik: false }, mismatch: false } },
    narrative: {
      headline: "A steady, heart-first match", summary: "28 out of 36 is traditionally a strong match. Your minds meet easily and your temperaments balance each other.",
      strengths: ["Graha Maitri 4/5: you think alike", "Nadi 8/8: strong health compatibility"], cautions: ["Bhakoot 0/7: talk money and family plans early"],
      doshaNote: "No Mangal dosh for either of you.", shareLine: "28/36 and the stars approve 💫",
    },
  }),
  getChatHistory: () => ({ messages: [] }),
  sendChatMessage: ({ text }) => ({
    messageId: String(Date.now()),
    reply: `Your chart shows a career shift favored this quarter, but Saturn suggests waiting two weeks before signing anything. (${text})`,
    creditsRemaining: 2,
  }),
  registerDevice: () => ({ ok: true }),
  updateNotificationPrefs: () => ({ ok: true }),
  deleteAccount: () => ({ deleted: true }),
};

export async function callFunction<T>(name: string, data: unknown = {}): Promise<T> {
  await wait(name === "getReading" || name === "createMatch" ? 1500 : 300);
  const fn = responses[name];
  if (!fn) throw new Error(`No web mock for ${name}`);
  return fn(data) as T;
}

export const ensureSignedIn = async () => "web-demo-user";
export const sendPhoneCode = async (): Promise<PhoneVerification> => ({ verificationId: "demo", autoCode: null });
export const confirmPhoneCode = async (): Promise<"linked" | "existing"> => "linked";
export const signOut = async () => undefined;
export const getPushToken = async () => null;
export const onPushTokenRefresh = () => () => undefined;
