import { describe, expect, it } from "vitest";
import { buildMatchPrompt } from "../../src/prompts/match";
import { buildReadingPrompt, readingSchema } from "../../src/prompts/reading";

const astro = {
  moonRashi: "Meena (Pisces)", rashiLord: "Jupiter", nakshatra: "Revati, pada 2", nakshatraLord: "Mercury",
  ascendant: null, timeKnown: false, nakshatraUncertain: true,
};

describe("prompts", () => {
  it("reading prompt carries astro facts, language and caveats but no personal data", () => {
    const p = buildReadingPrompt({
      period: "today", periodDescription: "Saturday, 26 September 2026", focusArea: "career", language: "hi",
      astro, transit: { moonRashi: "Meena (Pisces)", nakshatra: "Purva Bhadrapada" },
    });
    expect(p).toContain("Revati");
    expect(p).toContain("Devanagari");
    expect(p).toContain("Birth time is unknown");
    expect(p).toContain("career");
  });

  it("reading schema accepts a well-formed reading", () => {
    expect(readingSchema.safeParse({
      headline: "h", teaser: "t", mood: "calm",
      sections: [{ area: "career", title: "Work", body: "..." }],
      lucky: { color: "Green", number: 7, time: "10–11 am" },
      remedy: "Walk at sunrise",
    }).success).toBe(true);
  });

  it("match prompt includes every koota and the total", () => {
    const p = buildMatchPrompt({
      language: "en",
      personA: { label: "A", rashi: "Mesha", nakshatra: "Ashwini" },
      personB: { label: "B", rashi: "Vrishabha", nakshatra: "Rohini" },
      scores: { varna: 1, vashya: 2, tara: 1.5, yoni: 3, grahaMaitri: 3, gana: 6, bhakoot: 0, nadi: 8, total: 24.5 },
      doshas: { nadi: false, bhakoot: true, manglikA: false, manglikB: true },
    });
    expect(p).toContain("Total: 24.5/36");
    expect(p).toContain("Bhakoot dosha: yes");
  });
});
