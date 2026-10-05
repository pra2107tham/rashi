/**
 * Builds data/places.json for birth-place search from GeoNames (via the all-the-cities package):
 * every Indian town with 1,000+ people, plus cities of 100,000+ elsewhere for the diaspora.
 *
 *   npx tsx scripts/build-places.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

interface City {
  name: string;
  country: string;
  adminCode: string;
  population: number;
  loc: { coordinates: [number, number] };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cities: City[] = require("all-the-cities");

// GeoNames admin1 codes for India.
const IN_STATES: Record<string, string> = {
  "01": "Andaman and Nicobar", "02": "Andhra Pradesh", "03": "Assam", "05": "Chandigarh",
  "06": "Dadra and Nagar Haveli", "07": "Delhi", "09": "Gujarat", "10": "Haryana", "11": "Himachal Pradesh",
  "12": "Jammu and Kashmir", "13": "Kerala", "14": "Lakshadweep", "16": "Maharashtra", "17": "Manipur",
  "18": "Meghalaya", "19": "Karnataka", "20": "Nagaland", "21": "Odisha", "22": "Puducherry", "23": "Punjab",
  "24": "Rajasthan", "25": "Tamil Nadu", "26": "Tripura", "28": "West Bengal", "29": "Sikkim",
  "30": "Arunachal Pradesh", "31": "Mizoram", "32": "Daman and Diu", "33": "Goa", "34": "Bihar",
  "35": "Madhya Pradesh", "36": "Uttar Pradesh", "37": "Chhattisgarh", "38": "Jharkhand", "39": "Uttarakhand",
  "40": "Telangana", "41": "Ladakh",
};

/** Old or popular names → the GeoNames name, matched on the search key. */
const ALIASES: Record<string, string[]> = {
  bengaluru: ["bangalore"], kolkata: ["calcutta"], chennai: ["madras"], mumbai: ["bombay"], pune: ["poona"],
  cochin: ["kochi", "ernakulam"], bhubaneshwar: ["bhubaneswar"], gurgaon: ["gurugram"], allahabad: ["prayagraj"],
  vadodara: ["baroda"], thiruvananthapuram: ["trivandrum"], mysore: ["mysuru"], calicut: ["kozhikode"],
  mangalore: ["mangaluru"], belgaum: ["belagavi"], gulbarga: ["kalaburagi"], pondicherry: ["puducherry"],
  varanasi: ["benares", "banaras", "kashi"], kanpur: ["cawnpore"], shimla: ["simla"], vishakhapatnam: ["vizag"],
  visakhapatnam: ["vizag"], tiruchirappalli: ["trichy"], dehradun: ["dehra dun"], gurugram: ["gurgaon"],
};

export const searchKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const display = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const rows = cities
  .filter((c) => (c.country === "IN" ? true : c.population >= 100_000))
  .sort((a, b) => b.population - a.population)
  .map((c) => {
    const key = searchKey(c.name);
    const region = c.country === "IN" ? IN_STATES[c.adminCode] ?? "India" : regionNames.of(c.country) ?? c.country;
    const [lng, lat] = c.loc.coordinates;
    // [display name, search keys (name + aliases), region, country code, lat, lng]
    return [display(c.name), [key, ...(ALIASES[key] ?? []).map(searchKey)].join("|"), region, c.country, +lat.toFixed(4), +lng.toFixed(4)];
  });

const out = join(__dirname, "..", "data", "places.json");
writeFileSync(out, JSON.stringify(rows));
console.log(`${rows.length} places → ${out}`);
