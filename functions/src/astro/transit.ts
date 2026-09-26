import { houseFrom } from "./manglik";
import { describePlacement, type MoonPlacement } from "./nakshatra";

/** The nine taras, counted from the birth nakshatra to the transit nakshatra. */
export const TARAS = [
  { name: "Janma", hindi: "जन्म", tone: "mixed" },
  { name: "Sampat", hindi: "सम्पत", tone: "favourable" },
  { name: "Vipat", hindi: "विपत", tone: "challenging" },
  { name: "Kshema", hindi: "क्षेम", tone: "favourable" },
  { name: "Pratyari", hindi: "प्रत्यरि", tone: "challenging" },
  { name: "Sadhaka", hindi: "साधक", tone: "favourable" },
  { name: "Vadha", hindi: "वध", tone: "challenging" },
  { name: "Mitra", hindi: "मित्र", tone: "favourable" },
  { name: "Ati-Mitra", hindi: "अति-मित्र", tone: "favourable" },
] as const;

/** What each whole-sign house counted from the natal Moon is about. */
export const HOUSE_THEMES = [
  "self, body and mood",
  "family, speech and savings",
  "courage, communication, siblings and short trips",
  "home, mother, comfort and inner peace",
  "creativity, romance, children and learning",
  "daily work, health routines and obstacles",
  "partnerships, marriage and dealings with others",
  "sudden changes, hidden matters and research",
  "luck, teachers, faith and long journeys",
  "career, status and public reputation",
  "gains, friends, networks and wishes",
  "expenses, rest, letting go and faraway places",
] as const;

export interface TransitFacts {
  natal: ReturnType<typeof describePlacement>;
  transit: ReturnType<typeof describePlacement>;
  /** Whole-sign house (1–12) of the transit Moon counted from the natal Moon sign. */
  house: number;
  houseTheme: string;
  tara: { number: number; name: string; hindi: string; tone: string };
}

export function transitFacts(natalMoon: MoonPlacement, transitMoon: MoonPlacement): TransitFacts {
  const house = houseFrom(natalMoon.rashi, transitMoon.rashi);
  const count = ((transitMoon.nakshatra - natalMoon.nakshatra + 27) % 27) + 1;
  const taraNumber = ((count - 1) % 9) + 1;
  return {
    natal: describePlacement(natalMoon),
    transit: describePlacement(transitMoon),
    house,
    houseTheme: HOUSE_THEMES[house - 1],
    tara: { number: taraNumber, ...TARAS[taraNumber - 1] },
  };
}
