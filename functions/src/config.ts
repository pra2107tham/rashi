import { defineSecret, defineString } from "firebase-functions/params";

export const REGION = "asia-south1";

// Secrets (Secret Manager). Set with `firebase functions:secrets:set <NAME>`.
export const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");
export const SARVAM_API_KEY = defineSecret("SARVAM_API_KEY");
export const PII_ENC_KEY = defineSecret("PII_ENC_KEY"); // base64-encoded 32-byte AES key
export const PLAY_SERVICE_ACCOUNT = defineSecret("PLAY_SERVICE_ACCOUNT"); // service-account JSON

// Plain params (functions/.env or prompted on deploy).
export const PLAY_PACKAGE_NAME = defineString("PLAY_PACKAGE_NAME", { default: "com.rashi.app" });

export const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";

/**
 * All generation goes through OpenRouter's Auto Router, which picks a model per request.
 * `costTier: "low"` keeps it in the cheapest capable band; `maxPricePerMillion` is a hard
 * ceiling (USD per million tokens) so a routing change can never pick an expensive model.
 */
export const LLM = {
  model: "openrouter/auto",
  costTier: "low" as "low" | "medium" | "high" | "xhigh" | "max",
  maxPricePerMillion: { prompt: 1, completion: 4 },
  /**
   * Cheap routed models often "think" before answering, and those hidden tokens count against
   * max_tokens and add latency. Keep thinking short and don't send it back to us.
   */
  reasoning: { effort: "low", exclude: true },
  /**
   * Output budgets (thinking + visible text). Generous on purpose: Devanagari text uses 2–3× the
   * tokens of English, and you only pay for what's actually generated.
   */
  maxTokens: { reading: 12000, match: 8000, chat: 4000, notification: 4000 },
  appName: "Rashi",
  appUrl: "https://rashi-astro.web.app",
  /**
   * Hindi goes to Sarvam's own API (Indic-first models); English stays on the OpenRouter router.
   * If a Sarvam call fails, the request falls back to OpenRouter so the user still gets content.
   */
  sarvam: {
    languages: ["hi"] as readonly string[],
    model: "sarvam-105b",
    chatModel: "sarvam-105b-conversations",
    /** null switches thinking off: faster and cheaper, and readings don't need it. */
    reasoningEffort: null as "low" | "high" | "max" | null,
    /** Sarvam's default is 0.2 with thinking off, which reads flat for horoscope copy. */
    temperature: 0.7,
    /** max_tokens ceiling on Sarvam's Starter plan. */
    maxTokensCap: 4096,
    /** ₹ per million tokens, for cost logging. */
    inrPerMillion: { input: 29.28, output: 73.2 },
    inrPerUsd: 84,
  },
} as const;

export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

export const FOCUS_AREAS = ["love", "career", "money", "health", "curious"] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const PERIODS = ["today", "week", "month"] as const;
export type Period = (typeof PERIODS)[number];

/** Periods whose full reading is free; the rest show a teaser until unlocked or subscribed. */
export const FREE_FULL_PERIODS: readonly Period[] = ["today"];

export const FREE_CHAT_CREDITS = 3;
export const CHAT_HISTORY_LIMIT = 12;
export const CHAT_MAX_CHARS = 1000;

export const DEFAULT_NOTIFY_HOUR = 8;
export const MAX_FCM_TOKENS = 5;

export type ProductType = "unlock" | "credits" | "subscription";

export interface Product {
  type: ProductType;
  credits?: number;
}

/** Play Console product ids → what they grant. Keep in sync with the Play Console. */
export const PRODUCTS: Record<string, Product> = {
  reading_unlock: { type: "unlock" },
  chat_credits_10: { type: "credits", credits: 10 },
  chat_credits_30: { type: "credits", credits: 30 },
  rashi_plus_monthly: { type: "subscription" },
  rashi_plus_yearly: { type: "subscription" },
};

/** Per-user, per-minute call limits for callables that call the LLM. */
export const RATE_LIMITS = {
  reading: 20,
  match: 5,
  chat: 10,
  profile: 10,
} as const;
