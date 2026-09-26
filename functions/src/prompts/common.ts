import type { Language } from "../config";

export function languageInstruction(lang: Language): string {
  return lang === "hi"
    ? "Write everything in natural, warm, conversational Hindi using Devanagari script — the way a trusted family astrologer speaks, not a translation. Common English words people actually use (like 'career', 'office', 'date') may stay in English."
    : "Write everything in warm, conversational English suited to young Indian readers. Sanskrit astrology terms (rashi, nakshatra, dosha) are welcome where natural.";
}

/** Profile facts shared by every prompt. Contains no name, date, time or place. */
export interface AstroContext {
  moonRashi: string; // e.g. "Meena (Pisces)"
  nakshatra: string; // e.g. "Purva Bhadrapada, pada 4"
  nakshatraLord: string;
  rashiLord: string;
  ascendant: string | null;
  timeKnown: boolean;
  nakshatraUncertain: boolean;
}

export function describeAstro(ctx: AstroContext): string {
  const lines = [
    `Moon sign (rashi): ${ctx.moonRashi}, ruled by ${ctx.rashiLord}`,
    `Birth nakshatra: ${ctx.nakshatra}, ruled by ${ctx.nakshatraLord}`,
    ctx.ascendant ? `Ascendant (lagna): ${ctx.ascendant}` : "Ascendant: unknown (birth time not given)",
  ];
  if (!ctx.timeKnown) lines.push("Birth time is unknown, so avoid house-based claims.");
  if (ctx.nakshatraUncertain) lines.push("The nakshatra may be off by one because the birth time is unknown — lean on the rashi.");
  return lines.join("\n");
}

export const SAFETY_RULES = `Ground rules:
- Astrology here is for reflection and entertainment. Never present predictions as certain fate.
- Never give medical, legal or financial instructions (no diagnoses, medicines, specific investments or legal steps). For health or money topics, keep it to mood, habits and timing, and suggest a qualified professional when it matters.
- Never predict death, serious illness, accidents or divorce, and never use fear to push a purchase or ritual.
- If someone mentions self-harm, suicide or abuse, respond with care, encourage them to reach out to someone they trust, and share the Tele-MANAS helpline 14416 (India). Do not continue with astrology in that reply.`;
