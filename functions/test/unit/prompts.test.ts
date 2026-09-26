import { describe, expect, it } from "vitest";
import { z } from "zod";
import { placeMoon, transitFacts } from "../../src/astro";
import { buildMatchPrompt, matchNarrativeSchema, strength } from "../../src/prompts/match";
import { buildReadingPrompt, readingSchema } from "../../src/prompts/reading";

const astro = {
  moonRashi: "Meena (Pisces)", rashiLord: "Jupiter", nakshatra: "Revati, pada 2", nakshatraLord: "Mercury",
  ascendant: null, timeKnown: false, nakshatraUncertain: true,
};

describe("prompts", () => {
  it("reading prompt carries astro facts, language and caveats but no personal data", () => {
    const p = buildReadingPrompt({
      period: "today", periodDescription: "Saturday, 26 September 2026", focusArea: "career", language: "hi",
      astro, facts: transitFacts(placeMoon(282), placeMoon(340)), // Makara/Shravana natal, Meena/U.Bhadrapada transit
    });
    expect(p).toContain("Revati");
    expect(p).toContain("Devanagari");
    expect(p).toContain("Birth time is unknown");
    expect(p).toContain("career");
    expect(p).toContain("3rd house counted from the natal Moon sign");
    expect(p).toContain("Tara: Pratyari (प्रत्यरि), number 5 of 9");
    expect(p).toContain("never recalculate");
  });

  it("reading schema accepts a well-formed reading", () => {
    expect(readingSchema.safeParse({
      headline: "h", teaser: "t", mood: "calm",
      sections: [1, 2, 3].map(() => ({ area: "career", title: "Work", body: "..." })),
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
    expect(p).toContain("Total: 24.5 out of 36");
    expect(p).toContain("- Vashya: 2/2 (full)");
    expect(p).toContain("- Bhakoot: 0/7 (zero)");
    expect(p).toContain("- Tara: 1.5/3 (strong)");
    expect(p).toContain("Bhakoot dosha: yes");
  });

  it("labels koota strength", () => {
    expect([strength(0, 2), strength(1, 4), strength(3, 6), strength(8, 8)]).toEqual(["zero", "weak", "strong", "full"]);
  });

  it("clips a paragraph-length share line instead of failing", () => {
    const base = { headline: "h", summary: "s", strengths: [], cautions: [], doshaNote: "d" };
    const long = "दिल मिले तो तारे भी साथ चलते हैं ".repeat(10);
    const parsed = matchNarrativeSchema.parse({ ...base, shareLine: long });
    expect(parsed.shareLine.length).toBeLessThanOrEqual(121);
    expect(parsed.shareLine.endsWith("…")).toBe(true);
    expect(matchNarrativeSchema.parse({ ...base, shareLine: "short" }).shareLine).toBe("short");
  });

  it("repairs common Hindi slips in a reading instead of failing", () => {
    const reading = { headline: "h", teaser: "t", mood: "m", remedy: "r" };
    const parsed = readingSchema.parse({
      ...reading,
      lucky: { color: "नीला", number: "७", time: "शाम" },
      sections: [
        { area: "करियर", title: "t", body: "b" },
        { area: "Health", title: "t", body: "b" },
        { area: "ज्योतिष", title: "t", body: "b" },
        { area: "love", title: "t", body: "b" },
        { area: "money", title: "t", body: "b" },
      ],
    });
    expect(parsed.lucky.number).toBe(7);
    expect(parsed.sections.map((x) => x.area)).toEqual(["career", "health", "overall", "love"]);
  });

  it("still rejects a reading with fewer than 2 sections", () => {
    const reading = { headline: "h", teaser: "t", mood: "m", lucky: { color: "c", number: 1, time: "t" }, remedy: "r" };
    expect(readingSchema.safeParse({ ...reading, sections: [{ area: "career", title: "t", body: "b" }] }).success).toBe(false);
  });

  it("keeps the JSON schema sent to the model strict", () => {
    const schema = JSON.stringify(z.toJSONSchema(readingSchema, { target: "draft-7" }));
    expect(schema).toContain('"enum":["love","career","money","health","overall"]');
    expect(schema).toContain('"type":"integer"');
  });
});
