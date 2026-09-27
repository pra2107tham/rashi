import { z } from "zod";
import { boundedArray, clippedString, looseEnum, looseInt } from "./lenient";
import type { FocusArea, Language, Period } from "../config";
import type { TransitFacts } from "../astro";
import { SAFETY_RULES, describeAstro, describeTransitFacts, languageInstruction, type AstroContext } from "./common";

export const READING_PROMPT_VERSION = "reading-v4";

const AREAS = ["love", "career", "money", "health", "overall"] as const;
const AREA_ALIASES: Record<string, (typeof AREAS)[number]> = {
  प्रेम: "love", प्यार: "love", रिश्ते: "love", संबंध: "love", लव: "love",
  करियर: "career", कैरियर: "career", नौकरी: "career", काम: "career", व्यवसाय: "career",
  धन: "money", पैसा: "money", पैसे: "money", वित्त: "money", मनी: "money",
  स्वास्थ्य: "health", सेहत: "health", हेल्थ: "health",
  सामान्य: "overall", समग्र: "overall", कुल: "overall",
};

export const readingSchema = z.object({
  headline: z.string().describe("A 4–8 word hook for the card title"),
  teaser: z.string().describe("1–2 sentences that make the reader want to open the full reading, without giving away the advice"),
  mood: clippedString(40).describe("One or two words capturing the overall energy, not a sentence"),
  sections: boundedArray(
    z.object({
      area: looseEnum(AREAS, "overall", AREA_ALIASES).describe(
        "One of love, career, money, health, overall. Always in English, even for a Hindi reading.",
      ),
      title: z.string().describe("Short section title in the reading's language"),
      body: z.string().describe("60–110 words of plain prose, specific and actionable"),
    }),
    2,
    4,
  ).describe("Exactly 3 or 4 sections, each about a DIFFERENT area: the user's focus area first, then others. Never repeat an area."),
  lucky: z.object({
    color: z.string(),
    number: looseInt(1, 99).describe("A whole number from 1 to 99, written with Western digits"),
    time: z.string(),
  }),
  remedy: z.string().describe("One simple, free, positive practice for the period"),
});
export type ReadingContent = z.infer<typeof readingSchema>;

export const READING_SYSTEM = `You are Rashi, a thoughtful Vedic astrologer writing personalised horoscope readings for an Indian mobile app.

Readings are based on the person's sidereal (Lahiri) Moon sign and nakshatra, and on where the Moon is transiting during the period. You are given the transit house (counted from the natal Moon sign) and the tara as pre-calculated facts. Use them as the astrological basis, mention them briefly in plain words, and never recalculate them. Then focus on practical, relatable guidance.

Style:
- Specific and personal, never generic sun-sign filler. Speak to "you".
- Balanced: name one challenge and one opportunity, and end on an encouraging note.
- Weekly and monthly readings should describe how the period unfolds (early, middle, late), not just one day.

${SAFETY_RULES}`;

export interface ReadingPromptInput {
  period: Period;
  periodDescription: string;
  focusArea: FocusArea;
  language: Language;
  astro: AstroContext;
  facts: TransitFacts;
}

export function buildReadingPrompt(input: ReadingPromptInput): string {
  const focus = input.focusArea === "curious" ? "a general overview (they're curious about everything)" : input.focusArea;
  return `Write the ${input.period === "today" ? "daily" : input.period === "week" ? "weekly" : "monthly"} reading for ${input.periodDescription}.

Natal chart:
${describeAstro(input.astro)}

${describeTransitFacts(input.facts)}

The reader's main focus: ${focus}. Put it first, then cover ${input.focusArea === "curious" ? "three different areas" : "two or three other areas"} from love, career, money and health. Each section covers a different area, so never write two sections about the same one.

${languageInstruction(input.language)}`;
}
