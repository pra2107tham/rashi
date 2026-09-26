import { Body, Ecliptic, EclipticGeoMoon, GeoVector, MakeTime, SiderealTime, e_tilt } from "astronomy-engine";
import { lahiriAyanamsa } from "./ayanamsa";

export const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

function ayanamsaAt(date: Date): number {
  return lahiriAyanamsa(MakeTime(date).tt);
}

/** Sidereal (Lahiri) geocentric longitude of the Moon, degrees [0, 360). */
export function siderealMoonLongitude(date: Date): number {
  return norm360(EclipticGeoMoon(date).lon - ayanamsaAt(date));
}

/** Sidereal (Lahiri) geocentric longitude of Mars, degrees [0, 360). */
export function siderealMarsLongitude(date: Date): number {
  const ecl = Ecliptic(GeoVector(Body.Mars, date, true));
  return norm360(ecl.elon - ayanamsaAt(date));
}

/** Sidereal (Lahiri) ascendant for an observer, degrees [0, 360). */
export function siderealAscendant(date: Date, latitude: number, longitude: number): number {
  const time = MakeTime(date);
  const lstDeg = norm360(SiderealTime(time) * 15 + longitude);
  const ramc = (lstDeg * Math.PI) / 180;
  const eps = (e_tilt(time).tobl * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
  );
  return norm360((asc * 180) / Math.PI - ayanamsaAt(date));
}
