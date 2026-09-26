import type { TransitFacts } from "../astro";
import type { Language } from "../config";

export function languageInstruction(lang: Language): string {
  return lang === "hi"
    ? "Write everything, including titles, in natural, warm, conversational Hindi in Devanagari script, the way a trusted family astrologer speaks. It should not read like a translation. Never use Latin letters. When an everyday English word fits better, write it in Devanagari (करियर, ऑफिस, मीटिंग). Use plain text only: no markdown, asterisks, bullet symbols or headings inside the text."
    : "Write everything in warm, conversational English suited to young Indian readers. Sanskrit astrology terms (rashi, nakshatra, dosha) are welcome where natural. Use plain text only: no markdown, asterisks or headings inside the text.";
}

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/**
 * Transit facts calculated in code. Models get these wrong when left to count houses or taras
 * themselves, so they are stated as fixed facts.
 */
export function describeTransitFacts(f: TransitFacts): string {
  const r = (x: TransitFacts["natal"]["rashi"]) => `${x.name} (${x.english}, ${x.hindi})`;
  return `Pre-calculated facts. Use them exactly as given and never recalculate or contradict them:
- Natal Moon sign (janma rashi): ${r(f.natal.rashi)}
- Transit Moon now: ${r(f.transit.rashi)}, nakshatra ${f.transit.nakshatra.name} (${f.transit.nakshatra.hindi})
- The transit Moon is in the ${ordinal(f.house)} house counted from the natal Moon sign. This house is about ${f.houseTheme}.
- Tara: ${f.tara.name} (${f.tara.hindi}), number ${f.tara.number} of 9, counted from the birth nakshatra ${f.natal.nakshatra.name}. It is ${f.tara.tone}.`;
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
    ctx.ascendant
      ? `Ascendant (lagna): ${ctx.ascendant}. This is the rising sign, NOT the Moon sign; never call it the rashi.`
      : "Ascendant: unknown (birth time not given)",
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
