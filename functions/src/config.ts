import { defineSecret, defineString } from "firebase-functions/params";

export const REGION = "asia-south1";

// Secrets (Secret Manager). Set with `firebase functions:secrets:set <NAME>`.
export const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
export const PII_ENC_KEY = defineSecret("PII_ENC_KEY"); // base64-encoded 32-byte AES key
export const PLAY_SERVICE_ACCOUNT = defineSecret("PLAY_SERVICE_ACCOUNT"); // service-account JSON

// Plain params (functions/.env or prompted on deploy).
export const PLAY_PACKAGE_NAME = defineString("PLAY_PACKAGE_NAME", { default: "com.rashi.app" });

export const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";

export const MODELS = {
  reading: "claude-sonnet-5",
  match: "claude-sonnet-5",
  chat: "claude-sonnet-5",
  notification: "claude-haiku-4-5",
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

/** Per-user, per-minute call limits for callables that hit Claude. */
export const RATE_LIMITS = {
  reading: 20,
  match: 5,
  chat: 10,
  profile: 10,
} as const;
