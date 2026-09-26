import { z } from "zod";
import type { Language } from "../config";
import { SAFETY_RULES, languageInstruction } from "./common";

export const MATCH_PROMPT_VERSION = "match-v1";

export const matchNarrativeSchema = z.object({
  headline: z.string().describe("Short, shareable verdict, e.g. 'A steady, heart-first match'"),
  summary: z.string().describe("80–120 words explaining what the score means for this couple"),
  strengths: z.array(z.string()).describe("2–4 short points"),
  cautions: z.array(z.string()).describe("1–3 short, gentle points"),
  doshaNote: z.string().describe("Plain-language note on any dosha, or reassurance if none; never alarming"),
  shareLine: z.string().describe("A playful one-liner under 90 characters for a WhatsApp status card"),
});
export type MatchNarrative = z.infer<typeof matchNarrativeSchema>;

export const MATCH_SYSTEM = `You are Rashi, a Vedic astrologer explaining Ashtakoot Guna Milan (kundli matching) results in an Indian mobile app.

The scores are already calculated. Never change or recompute them. Explain what they mean for the couple in human terms.

Interpretation guide: below 18 of 36 is traditionally considered weak, 18–24 is acceptable, 25–32 is good, and above 32 is excellent. Stress that guna milan is one traditional lens, and that communication and shared values matter most. Mention doshas honestly but calmly. Note that traditional exceptions (cancellations) exist and that a family astrologer can review the full charts.

${SAFETY_RULES}`;

export interface MatchPromptInput {
  language: Language;
  personA: { label: string; rashi: string; nakshatra: string };
  personB: { label: string; rashi: string; nakshatra: string };
  scores: Record<string, number>;
  doshas: { nadi: boolean; bhakoot: boolean; manglikA: boolean; manglikB: boolean };
}

export function buildMatchPrompt(input: MatchPromptInput): string {
  const { scores, doshas } = input;
  return `Explain this kundli match.

${input.personA.label}: Moon in ${input.personA.rashi}, nakshatra ${input.personA.nakshatra}${doshas.manglikA ? ", Manglik" : ""}
${input.personB.label}: Moon in ${input.personB.rashi}, nakshatra ${input.personB.nakshatra}${doshas.manglikB ? ", Manglik" : ""}

Koota scores: Varna ${scores.varna}/1, Vashya ${scores.vashya}/2, Tara ${scores.tara}/3, Yoni ${scores.yoni}/4, Graha Maitri ${scores.grahaMaitri}/5, Gana ${scores.gana}/6, Bhakoot ${scores.bhakoot}/7, Nadi ${scores.nadi}/8.
Total: ${scores.total}/36.
Nadi dosha: ${doshas.nadi ? "yes" : "no"}. Bhakoot dosha: ${doshas.bhakoot ? "yes" : "no"}.

${languageInstruction(input.language)}`;
}
