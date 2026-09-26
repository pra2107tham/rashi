const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

/** Whole-sign house (1–12) of a planet counted from a reference sign. */
export function houseFrom(referenceRashi: number, planetRashi: number): number {
  return ((planetRashi - referenceRashi + 12) % 12) + 1;
}

export interface ManglikResult {
  isManglik: boolean;
  fromMoon: boolean;
  fromLagna: boolean | null; // null when birth time (and so the ascendant) is unknown
}

export function manglikStatus(marsRashi: number, moonRashi: number, ascendantRashi: number | null): ManglikResult {
  const fromMoon = MANGLIK_HOUSES.has(houseFrom(moonRashi, marsRashi));
  const fromLagna = ascendantRashi === null ? null : MANGLIK_HOUSES.has(houseFrom(ascendantRashi, marsRashi));
  return { isManglik: fromMoon || fromLagna === true, fromMoon, fromLagna };
}
