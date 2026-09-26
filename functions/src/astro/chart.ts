import { DateTime } from "luxon";
import { siderealAscendant, siderealMarsLongitude, siderealMoonLongitude } from "./ephemeris";
import { placeMoon, rashiOf, type MoonPlacement } from "./nakshatra";

export interface BirthInput {
  birthDate: string; // YYYY-MM-DD, local to the birth place
  birthTime?: string | null; // HH:mm (24h) local, null/undefined if unknown
  lat: number;
  lng: number;
  tz: string; // IANA zone of the birth place
}

export interface BirthChart {
  timeKnown: boolean;
  birthUtc: string;
  moon: MoonPlacement;
  /** True when the Moon's nakshatra could differ across the birth day (only when time is unknown). */
  nakshatraUncertain: boolean;
  marsRashi: number;
  ascendantRashi: number | null;
}

const UNKNOWN_TIME = "12:00";

export function birthMoment(input: Pick<BirthInput, "birthDate" | "birthTime" | "tz">): Date {
  const time = input.birthTime ?? UNKNOWN_TIME;
  const dt = DateTime.fromISO(`${input.birthDate}T${time}`, { zone: input.tz });
  if (!dt.isValid) throw new Error(`Invalid birth date/time: ${dt.invalidExplanation ?? "unknown"}`);
  return dt.toJSDate();
}

export function computeChart(input: BirthInput): BirthChart {
  const timeKnown = Boolean(input.birthTime);
  const at = birthMoment(input);
  const moon = placeMoon(siderealMoonLongitude(at));

  let nakshatraUncertain = false;
  if (!timeKnown) {
    const start = birthMoment({ ...input, birthTime: "00:00" });
    const end = birthMoment({ ...input, birthTime: "23:59" });
    nakshatraUncertain =
      placeMoon(siderealMoonLongitude(start)).nakshatra !== moon.nakshatra ||
      placeMoon(siderealMoonLongitude(end)).nakshatra !== moon.nakshatra;
  }

  return {
    timeKnown,
    birthUtc: at.toISOString(),
    moon,
    nakshatraUncertain,
    marsRashi: rashiOf(siderealMarsLongitude(at)),
    ascendantRashi: timeKnown ? rashiOf(siderealAscendant(at, input.lat, input.lng)) : null,
  };
}

/** The Moon's current sidereal placement — the daily "transit" input for readings. */
export function transitMoon(at: Date = new Date()): MoonPlacement {
  return placeMoon(siderealMoonLongitude(at));
}
