import { z } from "zod";
import { boundedArray, clippedString } from "./lenient";
import type { Language } from "../config";
import { SAFETY_RULES, languageInstruction } from "./common";

export const MATCH_PROMPT_VERSION = "match-v3";

export const matchNarrativeSchema = z.object({
  headline: z.string().describe("Short, shareable verdict, e.g. 'A steady, heart-first match'"),
  summary: z.string().describe("80–120 words explaining what the score means for this couple"),
  strengths: boundedArray(z.string(), 0, 4).describe("2–4 short points, only about kootas marked strong or full"),
  cautions: boundedArray(z.string(), 0, 3).describe("1–3 short, gentle points, only about kootas marked weak or zero"),
  doshaNote: z.string().describe("Your own plain-language note on any dosha, or reassurance if none; never alarming"),
  shareLine: clippedString(120).describe(
    "A playful one-liner of at most 90 characters for a WhatsApp status card, with the score in it, e.g. \"25/36 and the stars approve 💫\". Not advice, not a disclaimer.",
  ),
});
export type MatchNarrative = z.infer<typeof matchNarrativeSchema>;

export const MATCH_SYSTEM = `You are Rashi, a Vedic astrologer explaining Ashtakoot Guna Milan (kundli matching) results in an Indian mobile app.

The scores are already calculated, and each koota is labelled full, strong, weak or zero. Never change, recompute or relabel them. Only call a koota a strength if it is labelled full or strong. Explain what the scores mean for the couple in human terms, in your own words, without copying the input lines.

Interpretation guide: below 18 of 36 is traditionally considered weak, 18–24 is acceptable, 25–32 is good, and above 32 is excellent. Stress that guna milan is one traditional lens, and that communication and shared values matter most. Mention doshas honestly but calmly. Note that traditional exceptions (cancellations) exist and that a family astrologer can review the full charts.

${SAFETY_RULES}`;

const KOOTAS: [string, string, number][] = [
  ["varna", "Varna (वर्ण)", 1], ["vashya", "Vashya (वश्य)", 2], ["tara", "Tara (तारा)", 3],
  ["yoni", "Yoni (योनि)", 4], ["grahaMaitri", "Graha Maitri (ग्रह मैत्री)", 5], ["gana", "Gana (गण)", 6],
  ["bhakoot", "Bhakoot (भकूट)", 7], ["nadi", "Nadi (नाड़ी)", 8],
];

export function strength(score: number, max: number): "full" | "strong" | "weak" | "zero" {
  if (score === 0) return "zero";
  if (score === max) return "full";
  return score / max >= 0.5 ? "strong" : "weak";
}

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

Koota scores (fixed; do not change):
${KOOTAS.map(([key, label, max]) => `- ${label}: ${scores[key]}/${max} (${strength(scores[key], max)})`).join("\n")}
Total: ${scores.total} out of 36.
Nadi dosha (नाड़ी दोष): ${doshas.nadi ? "yes" : "no"}. Bhakoot dosha (भकूट दोष): ${doshas.bhakoot ? "yes" : "no"}.
Spell koota and dosha names exactly as written above.

${languageInstruction(input.language)}`;
}
