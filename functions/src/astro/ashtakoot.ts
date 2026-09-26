import type { BirthChart } from "./chart";
import { manglikStatus, type ManglikResult } from "./manglik";
import {
  GANA_MATRIX, GANA_ORDER, NAKSHATRAS, PLANET_RELATIONS, RASHIS, VARNA_RANK,
  VASHYA_MATRIX, VASHYA_ORDER, YONI_MATRIX, YONI_ORDER, type VashyaGroup,
} from "./tables";
import type { MoonPlacement } from "./nakshatra";

export interface KootaScores {
  varna: number; // /1
  vashya: number; // /2
  tara: number; // /3
  yoni: number; // /4
  grahaMaitri: number; // /5
  gana: number; // /6
  bhakoot: number; // /7
  nadi: number; // /8
  total: number; // /36
}

export interface MatchDoshas {
  nadi: boolean;
  bhakoot: boolean;
  manglik: { groom: ManglikResult; bride: ManglikResult; mismatch: boolean };
}

export interface MatchResult {
  scores: KootaScores;
  doshas: MatchDoshas;
}

export const KOOTA_MAX: Omit<KootaScores, "total"> = {
  varna: 1, vashya: 2, tara: 3, yoni: 4, grahaMaitri: 5, gana: 6, bhakoot: 7, nadi: 8,
};

export function vashyaGroup(moon: MoonPlacement): VashyaGroup {
  const firstHalf = moon.degreeInRashi < 15;
  switch (moon.rashi) {
    case 0: case 1: return "Chatushpada";
    case 2: case 5: case 6: case 10: return "Manava";
    case 3: case 11: return "Jalachara";
    case 4: return "Vanachara";
    case 7: return "Keeta";
    case 8: return firstHalf ? "Manava" : "Chatushpada";
    case 9: return firstHalf ? "Chatushpada" : "Jalachara";
    default: throw new Error(`bad rashi ${moon.rashi}`);
  }
}

function varnaScore(groom: MoonPlacement, bride: MoonPlacement): number {
  return VARNA_RANK[RASHIS[groom.rashi].varna] >= VARNA_RANK[RASHIS[bride.rashi].varna] ? 1 : 0;
}

function vashyaScore(groom: MoonPlacement, bride: MoonPlacement): number {
  return VASHYA_MATRIX[VASHYA_ORDER.indexOf(vashyaGroup(groom))][VASHYA_ORDER.indexOf(vashyaGroup(bride))];
}

const INAUSPICIOUS_TARA = new Set([3, 5, 7]); // Vipat, Pratyari, Vadha

function taraFrom(from: number, to: number): number {
  const count = ((to - from + 27) % 27) + 1;
  const tara = count % 9 === 0 ? 9 : count % 9;
  return INAUSPICIOUS_TARA.has(tara) ? 0 : 1.5;
}

function taraScore(groom: MoonPlacement, bride: MoonPlacement): number {
  return taraFrom(bride.nakshatra, groom.nakshatra) + taraFrom(groom.nakshatra, bride.nakshatra);
}

function yoniScore(groom: MoonPlacement, bride: MoonPlacement): number {
  const g = YONI_ORDER.indexOf(NAKSHATRAS[groom.nakshatra].yoni);
  const b = YONI_ORDER.indexOf(NAKSHATRAS[bride.nakshatra].yoni);
  return YONI_MATRIX[g][b];
}

function grahaMaitriScore(groom: MoonPlacement, bride: MoonPlacement): number {
  const g = RASHIS[groom.rashi].lord;
  const b = RASHIS[bride.rashi].lord;
  if (g === b) return 5;
  const rel = [PLANET_RELATIONS[g][b], PLANET_RELATIONS[b][g]].sort().join("-");
  switch (rel) {
    case "friend-friend": return 5;
    case "friend-neutral": return 4;
    case "neutral-neutral": return 3;
    case "enemy-friend": return 1;
    case "enemy-neutral": return 0.5;
    default: return 0; // enemy-enemy
  }
}

function ganaScore(groom: MoonPlacement, bride: MoonPlacement): number {
  const g = GANA_ORDER.indexOf(NAKSHATRAS[groom.nakshatra].gana);
  const b = GANA_ORDER.indexOf(NAKSHATRAS[bride.nakshatra].gana);
  return GANA_MATRIX[g][b];
}

const BHAKOOT_DOSHA_DISTANCES = new Set([2, 12, 5, 9, 6, 8]);

function hasBhakootDosha(groom: MoonPlacement, bride: MoonPlacement): boolean {
  const distance = ((groom.rashi - bride.rashi + 12) % 12) + 1;
  return BHAKOOT_DOSHA_DISTANCES.has(distance);
}

function hasNadiDosha(groom: MoonPlacement, bride: MoonPlacement): boolean {
  return NAKSHATRAS[groom.nakshatra].nadi === NAKSHATRAS[bride.nakshatra].nadi;
}

/** Deterministic Ashtakoot Guna Milan (0–36). Dosha cancellations are not applied. */
export function ashtakoot(groomChart: BirthChart, brideChart: BirthChart): MatchResult {
  const g = groomChart.moon;
  const b = brideChart.moon;
  const bhakootDosha = hasBhakootDosha(g, b);
  const nadiDosha = hasNadiDosha(g, b);

  const partial = {
    varna: varnaScore(g, b),
    vashya: vashyaScore(g, b),
    tara: taraScore(g, b),
    yoni: yoniScore(g, b),
    grahaMaitri: grahaMaitriScore(g, b),
    gana: ganaScore(g, b),
    bhakoot: bhakootDosha ? 0 : 7,
    nadi: nadiDosha ? 0 : 8,
  };
  const total = Object.values(partial).reduce((sum, v) => sum + v, 0);

  const groomManglik = manglikStatus(groomChart.marsRashi, g.rashi, groomChart.ascendantRashi);
  const brideManglik = manglikStatus(brideChart.marsRashi, b.rashi, brideChart.ascendantRashi);

  return {
    scores: { ...partial, total },
    doshas: {
      nadi: nadiDosha,
      bhakoot: bhakootDosha,
      manglik: {
        groom: groomManglik,
        bride: brideManglik,
        mismatch: groomManglik.isManglik !== brideManglik.isManglik,
      },
    },
  };
}
