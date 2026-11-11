import { readFileSync } from "node:fs";
import { join } from "node:path";

/** [display name, search keys "a|b", region, country code, lat, lng] — built by scripts/build-places.ts */
type Row = [string, string, string, string, number, number];

export interface Place {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

let rows: Row[] | undefined;
function load(): Row[] {
  rows ??= JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "places.json"), "utf8")) as Row[];
  return rows;
}

const searchKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Birth-place autocomplete. Rows are sorted by population, so within each match tier bigger places
 * come first; Indian places win ties because most users were born in India.
 */
export function searchPlaces(query: string, limit = 8): Place[] {
  const q = searchKey(query);
  if (q.length < 2) return [];
  const tiers: Row[][] = [[], [], []]; // exact, prefix, contains
  for (const row of load()) {
    const keys = row[1].split("|");
    const tier = keys.some((k) => k === q) ? 0 : keys.some((k) => k.startsWith(q)) ? 1 : keys.some((k) => k.includes(q)) ? 2 : -1;
    if (tier >= 0) tiers[tier].push(row);
  }
  const ranked = tiers.flatMap((t) => [...t.filter((r) => r[3] === "IN"), ...t.filter((r) => r[3] !== "IN")]);
  return ranked.slice(0, limit).map(([name, , region, country, lat, lng]) => ({ name, region, country, lat, lng }));
}
