import { z } from "zod";
import {
  OPENROUTER_API_KEY, FOCUS_AREAS, LANGUAGES, PERIODS, PII_ENC_KEY, PLAY_SERVICE_ACCOUNT, PRODUCTS, RATE_LIMITS,
  CHAT_MAX_CHARS,
} from "../config";
import { birthDetailsSchema } from "../lib/validate";
import { obfuscatedAccountId, verifyPurchase as verify } from "../services/billing";
import { sendChatMessage as chat } from "../services/chat";
import { loadEntitlements, publicEntitlements } from "../services/entitlements";
import { createMatch as match } from "../services/match";
import { registerDevice as register, updateNotificationPrefs as updatePrefs } from "../services/notifications";
import { deleteUserData, loadProfile, toPublicProfile, upsertProfile as upsert } from "../services/profile";
import { getReading as reading } from "../services/readings";
import { callable } from "./callable";

// ---- Phase 1: profile & readings --------------------------------------------------------------

export const upsertProfile = callable(
  birthDetailsSchema.extend({ focusArea: z.enum(FOCUS_AREAS), language: z.enum(LANGUAGES) }),
  async (uid, data, req) => ({ chart: await upsert(uid, (req.auth?.token.phone_number as string) ?? null, data) }),
  { secrets: [PII_ENC_KEY], rateLimit: { bucket: "profile", perMinute: RATE_LIMITS.profile } },
);

export const getProfile = callable(z.object({}), async (uid) => {
  const [profile, ent] = await Promise.all([loadProfile(uid), loadEntitlements(uid)]);
  return {
    profile: toPublicProfile(profile),
    entitlements: publicEntitlements(ent),
    playAccountId: obfuscatedAccountId(uid),
  };
}, { secrets: [PII_ENC_KEY] });

export const getReading = callable(
  z.object({ period: z.enum(PERIODS) }),
  (uid, data) => reading(uid, data.period),
  {
    secrets: [PII_ENC_KEY, OPENROUTER_API_KEY],
    timeoutSeconds: 60,
    memory: "512MiB",
    rateLimit: { bucket: "reading", perMinute: RATE_LIMITS.reading },
  },
);

export const deleteAccount = callable(z.object({ confirm: z.literal(true) }), async (uid) => {
  await deleteUserData(uid);
  return { deleted: true };
});

// ---- Phase 2: monetization --------------------------------------------------------------------

export const verifyPurchase = callable(
  z.object({
    productId: z.string().refine((id) => id in PRODUCTS, "unknown product"),
    purchaseToken: z.string().min(10).max(4096),
    readingId: z.string().max(200).optional(),
  }),
  (uid, data) => verify(uid, data),
  { secrets: [PLAY_SERVICE_ACCOUNT] },
);

// ---- Phase 3: retention -----------------------------------------------------------------------

export const registerDevice = callable(
  z.object({ fcmToken: z.string().min(10).max(4096), tz: z.string().max(64).optional() }),
  async (uid, data) => {
    await register(uid, data.fcmToken, data.tz);
    return { ok: true };
  },
);

export const updateNotificationPrefs = callable(
  z.object({ enabled: z.boolean(), localHour: z.number().int().min(0).max(23).optional() }),
  async (uid, data) => {
    await updatePrefs(uid, data);
    return { ok: true };
  },
);

// ---- Phase 4: kundli match --------------------------------------------------------------------

export const createMatch = callable(
  z.object({ userRole: z.enum(["groom", "bride"]), other: birthDetailsSchema }),
  (uid, data) => match(uid, data),
  {
    secrets: [PII_ENC_KEY, OPENROUTER_API_KEY],
    memory: "512MiB",
    rateLimit: { bucket: "match", perMinute: RATE_LIMITS.match },
  },
);

// ---- Phase 5: chat ----------------------------------------------------------------------------

export const sendChatMessage = callable(
  z.object({ text: z.string().trim().min(1).max(CHAT_MAX_CHARS) }),
  (uid, data) => chat(uid, data.text),
  {
    secrets: [PII_ENC_KEY, OPENROUTER_API_KEY],
    rateLimit: { bucket: "chat", perMinute: RATE_LIMITS.chat },
  },
);
