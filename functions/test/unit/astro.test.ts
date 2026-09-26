import { describe, expect, it } from "vitest";
import {
  ashtakoot, computeChart, houseFrom, manglikStatus, placeMoon, transitFacts, type BirthChart,
} from "../../src/astro";
import { YONI_MATRIX } from "../../src/astro/tables";
import { siderealAscendant } from "../../src/astro/ephemeris";

const DELHI = { lat: 28.6139, lng: 77.209, tz: "Asia/Kolkata" };

function chartAt(longitude: number, extra: Partial<BirthChart> = {}): BirthChart {
  return {
    timeKnown: true, birthUtc: "", moon: placeMoon(longitude), nakshatraUncertain: false,
    marsRashi: 0, ascendantRashi: null, ...extra,
  };
}

describe("moon placement", () => {
  it("maps longitudes to rashi, nakshatra and pada", () => {
    expect(placeMoon(0)).toMatchObject({ rashi: 0, nakshatra: 0, pada: 1 });
    expect(placeMoon(13.34)).toMatchObject({ rashi: 0, nakshatra: 1, pada: 1 });
    expect(placeMoon(3.4)).toMatchObject({ nakshatra: 0, pada: 2 });
    expect(placeMoon(359.9)).toMatchObject({ rashi: 11, nakshatra: 26, pada: 4 });
  });

  it("puts the Bhadrapada Purnima moon (26 Sep 2026) in Purva Bhadrapada, Meena", () => {
    const c = computeChart({ ...DELHI, birthDate: "2026-09-26", birthTime: "06:00" });
    expect(c.moon.rashi).toBe(11);
    expect(c.moon.nakshatra).toBe(24);
  });

  it("puts the Sharad Purnima moon (16 Oct 2024) in Revati / Ashwini", () => {
    // Sharad (Ashwin) Purnima: the full moon sits near the Revati–Ashwini boundary.
    const c = computeChart({ ...DELHI, birthDate: "2024-10-17", birthTime: "05:00" });
    expect([26, 0]).toContain(c.moon.nakshatra);
  });

  it("flags unknown birth time and skips the ascendant", () => {
    const c = computeChart({ ...DELHI, birthDate: "1995-03-10", birthTime: null });
    expect(c.timeKnown).toBe(false);
    expect(c.ascendantRashi).toBeNull();
  });

  it("gives an ascendant near the Sun's sign at sunrise", () => {
    // Around 06:10 IST on 26 Sep 2026 the Sun is ~9° sidereal Virgo; the rising sign is Kanya.
    const asc = siderealAscendant(new Date("2026-09-26T00:40:00Z"), DELHI.lat, DELHI.lng);
    expect(Math.floor(asc / 30)).toBe(5);
  });
});

describe("manglik", () => {
  it("counts whole-sign houses", () => {
    expect(houseFrom(0, 0)).toBe(1);
    expect(houseFrom(10, 1)).toBe(4);
  });
  it("flags Mars in the 7th from the Moon", () => {
    expect(manglikStatus(6, 0, null)).toEqual({ isManglik: true, fromMoon: true, fromLagna: null });
    expect(manglikStatus(2, 0, 2)).toEqual({ isManglik: true, fromMoon: false, fromLagna: true });
    expect(manglikStatus(2, 0, null).isManglik).toBe(false);
  });
});

describe("ashtakoot", () => {
  it("yoni matrix is symmetric", () => {
    YONI_MATRIX.forEach((row, i) => row.forEach((v, j) => expect(v).toBe(YONI_MATRIX[j][i])));
  });

  it("scores a hand-worked pair: Ashwini groom × Rohini bride = 24.5", () => {
    const groom = chartAt(5); // Mesha, Ashwini
    const bride = chartAt(45); // Vrishabha, Rohini
    const { scores, doshas } = ashtakoot(groom, bride);
    expect(scores).toEqual({
      varna: 1, vashya: 2, tara: 1.5, yoni: 3, grahaMaitri: 3, gana: 6, bhakoot: 0, nadi: 8, total: 24.5,
    });
    expect(doshas.bhakoot).toBe(true);
    expect(doshas.nadi).toBe(false);
  });

  it("same nakshatra: full marks except nadi (dosha)", () => {
    const { scores, doshas } = ashtakoot(chartAt(50), chartAt(50));
    expect(scores.nadi).toBe(0);
    expect(scores.bhakoot).toBe(7);
    expect(scores.total).toBe(28);
    expect(doshas.nadi).toBe(true);
  });

  it("always totals between 0 and 36", () => {
    for (let g = 0; g < 360; g += 7.3) {
      for (let b = 0; b < 360; b += 11.1) {
        const { scores } = ashtakoot(chartAt(g), chartAt(b));
        const { total, ...parts } = scores;
        expect(total).toBe(Object.values(parts).reduce((a, v) => a + v, 0));
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeLessThanOrEqual(36);
      }
    }
  });
});

describe("transit facts", () => {
  it("counts the house from the natal Moon and the tara from the birth nakshatra", () => {
    // Natal: Makara, Shravana (282°). Transit: Meena, Uttara Bhadrapada (340°).
    const f = transitFacts(placeMoon(282), placeMoon(340));
    expect(f.natal.rashi.name).toBe("Makara");
    expect(f.transit.rashi.name).toBe("Meena");
    expect(f.house).toBe(3);
    expect(f.tara).toMatchObject({ number: 5, name: "Pratyari", tone: "challenging" });
  });

  it("wraps around the zodiac and the nakshatra cycle", () => {
    const f = transitFacts(placeMoon(350), placeMoon(5)); // Meena/Revati → Mesha/Ashwini
    expect(f.house).toBe(2);
    expect(f.tara).toMatchObject({ number: 2, name: "Sampat" });
    expect(transitFacts(placeMoon(100), placeMoon(100)).tara.name).toBe("Janma");
  });
});
