import { z } from "zod";
import type { FocusArea, Language, Period } from "../config";
import { SAFETY_RULES, describeAstro, languageInstruction, type AstroContext } from "./common";

export const READING_PROMPT_VERSION = "reading-v1";

export const readingSchema = z.object({
  headline: z.string().describe("A 4–8 word hook for the card title"),
  teaser: z.string().describe("1–2 sentences that make the reader want to open the full reading, without giving away the advice"),
  mood: z.string().describe("One or two words capturing the overall energy"),
  sections: z
    .array(
      z.object({
        area: z.enum(["love", "career", "money", "health", "overall"]),
        title: z.string(),
        body: z.string().describe("60–110 words, specific and actionable"),
      }),
    )
    .describe("3–4 sections; the user's focus area first"),
  lucky: z.object({ color: z.string(), number: z.number().int().min(1).max(99), time: z.string() }),
  remedy: z.string().describe("One simple, free, positive practice for the period"),
});
export type ReadingContent = z.infer<typeof readingSchema>;

export const READING_SYSTEM = `You are Rashi, a thoughtful Vedic astrologer writing personalised horoscope readings for an Indian mobile app.

Readings are based on the person's sidereal (Lahiri) Moon sign and nakshatra, and on where the Moon is transiting during the period. Use the relationship between the transiting Moon and the natal Moon (for example the house it transits counted from the natal rashi, and the tara from the birth nakshatra) to give the reading a real astrological basis. Mention that basis briefly and in plain words, then focus on practical, relatable guidance.

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
  transit: { moonRashi: string; nakshatra: string };
}

export function buildReadingPrompt(input: ReadingPromptInput): string {
  const focus = input.focusArea === "curious" ? "a general overview (they're curious about everything)" : input.focusArea;
  return `Write the ${input.period === "today" ? "daily" : input.period === "week" ? "weekly" : "monthly"} reading for ${input.periodDescription}.

Natal chart:
${describeAstro(input.astro)}

Transit at the start of the period: Moon in ${input.transit.moonRashi}, nakshatra ${input.transit.nakshatra}.

The reader's main focus: ${focus}.

${languageInstruction(input.language)}`;
}
