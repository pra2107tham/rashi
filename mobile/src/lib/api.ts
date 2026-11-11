import { callFunction } from "./firebase";
import type { FocusArea, Language, Place } from "./store";

/** Typed wrappers for the Cloud Functions callables (functions/src/handlers/index.ts). */

export type Period = "today" | "week" | "month";

export interface ChartInfo {
  rashi: { index: number; name: string; english: string; hindi: string; lord: string };
  nakshatra: { index: number; name: string; hindi: string; lord: string; pada: number };
  ascendant: { index: number; name: string; english: string } | null;
  timeKnown: boolean;
  nakshatraUncertain: boolean;
}

export interface Entitlements {
  chatCredits: number;
  subscribed: boolean;
  subscriptionExpiresAt: string | null;
}

export interface ProfileResponse {
  profile: {
    name: string;
    birthDate: string;
    birthTime: string | null;
    placeName: string;
    lat: number;
    lng: number;
    focusArea: FocusArea;
    language: Language;
    chart: ChartInfo;
  };
  entitlements: Entitlements;
  playAccountId: string;
}

export interface ReadingSection {
  area: "love" | "career" | "money" | "health" | "overall";
  title: string;
  body: string;
}

export interface ReadingContent {
  headline: string;
  teaser: string;
  mood: string;
  sections: ReadingSection[];
  lucky: { color: string; number: number; time: string };
  remedy: string;
}

export interface Reading {
  id: string;
  period: Period;
  periodKey: string;
  headline: string;
  teaser: string;
  mood: string;
  locked: boolean;
  content: ReadingContent | null;
}

export interface Koota {
  varna: number; vashya: number; tara: number; yoni: number;
  grahaMaitri: number; gana: number; bhakoot: number; nadi: number; total: number;
}

export interface MatchResult {
  id: string;
  otherName: string;
  you: { rashi: string; nakshatra: string };
  them: { rashi: string; nakshatra: string };
  scores: Koota;
  doshas: {
    nadi: boolean;
    bhakoot: boolean;
    manglik: { you: { isManglik: boolean }; them: { isManglik: boolean }; mismatch: boolean };
  };
  narrative: {
    headline: string;
    summary: string;
    strengths: string[];
    cautions: string[];
    doshaNote: string;
    shareLine: string;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number | null;
}

export interface BirthDetails {
  name: string;
  birthDate: string;
  birthTime: string | null;
  placeName: string;
  lat: number;
  lng: number;
}

export const api = {
  searchPlaces: (query: string) => callFunction<{ places: Place[] }>("searchPlaces", { query }).then((r) => r.places),
  upsertProfile: (p: BirthDetails & { focusArea: FocusArea; language: Language }) =>
    callFunction<{ chart: ChartInfo }>("upsertProfile", p),
  getProfile: () => callFunction<ProfileResponse>("getProfile"),
  getReading: (period: Period) => callFunction<Reading>("getReading", { period }),
  createMatch: (input: { userRole: "groom" | "bride"; other: BirthDetails }) =>
    callFunction<MatchResult>("createMatch", input),
  getChatHistory: () => callFunction<{ messages: ChatMessage[] }>("getChatHistory", { limit: 50 }).then((r) => r.messages),
  sendChatMessage: (text: string) =>
    callFunction<{ messageId: string; reply: string; creditsRemaining: number }>("sendChatMessage", { text }),
  registerDevice: (fcmToken: string, tz: string) => callFunction<{ ok: true }>("registerDevice", { fcmToken, tz }),
  updateNotificationPrefs: (enabled: boolean, localHour?: number) =>
    callFunction<{ ok: true }>("updateNotificationPrefs", { enabled, localHour }),
  deleteAccount: () => callFunction<{ deleted: true }>("deleteAccount", { confirm: true }),
};

/** Firebase callable errors carry a code like "functions/resource-exhausted". */
export function errorCode(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  return code.replace(/^functions\//, "");
}
