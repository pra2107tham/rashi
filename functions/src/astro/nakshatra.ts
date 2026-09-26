import { NAKSHATRAS, RASHIS } from "./tables";

const NAKSHATRA_SPAN = 360 / 27; // 13°20'
const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3°20'

export interface MoonPlacement {
  longitude: number;
  rashi: number;
  nakshatra: number;
  pada: number; // 1–4
  degreeInRashi: number;
}

export function rashiOf(longitude: number): number {
  return Math.floor(longitude / 30) % 12;
}

export function placeMoon(longitude: number): MoonPlacement {
  const nakshatra = Math.floor(longitude / NAKSHATRA_SPAN) % 27;
  const pada = (Math.floor((longitude % NAKSHATRA_SPAN) / PADA_SPAN) % 4) + 1;
  return {
    longitude,
    rashi: rashiOf(longitude),
    nakshatra,
    pada,
    degreeInRashi: longitude % 30,
  };
}

/** Human-readable labels for prompts and API responses. */
export function describePlacement(p: MoonPlacement) {
  const r = RASHIS[p.rashi];
  const n = NAKSHATRAS[p.nakshatra];
  return {
    rashi: { index: p.rashi, name: r.name, english: r.english, hindi: r.hindi, lord: r.lord },
    nakshatra: { index: p.nakshatra, name: n.name, hindi: n.hindi, lord: n.lord, pada: p.pada },
  };
}
