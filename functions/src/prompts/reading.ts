import { z } from "zod";
import type { FocusArea, Language, Period } from "../config";
import type { TransitFacts } from "../astro";
import { SAFETY_RULES, describeAstro, describeTransitFacts, languageInstruction, type AstroContext } from "./common";

export const READING_PROMPT_VERSION = "reading-v2";

export const readingSchema = z.object({
  headline: z.string().describe("A 4–8 word hook for the card title"),
  teaser: z.string().describe("1–2 sentences that make the reader want to open the full reading, without giving away the advice"),
  mood: z.string().describe("One or two words capturing the overall energy"),
  sections: z
    .array(
      z.object({
        area: z.enum(["love", "career", "money", "health", "overall"]),
        title: z.string().describe("Short section title in the reading's language"),
        body: z.string().describe("60–110 words of plain prose, specific and actionable"),
      }),
    )
    .describe("Exactly 3 or 4 sections; the user's focus area first")
    .refine((s) => s.length >= 3 && s.length <= 4, "3 or 4 sections required"),
  lucky: z.object({ color: z.string(), number: z.number().int().min(1).max(99), time: z.string() }),
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

The reader's main focus: ${focus}.

${languageInstruction(input.language)}`;
}
