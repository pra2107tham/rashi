// Lahiri (Chitrapaksha) ayanamsa: 23.85709° at J2000.0, precessing ~50.29"/year.
const LAHIRI_J2000 = 23.85709;
const RATE_PER_CENTURY = 1.396971;
const QUADRATIC = 0.000308;

/** Lahiri ayanamsa in degrees for a moment given as days since J2000 (TT). */
export function lahiriAyanamsa(daysSinceJ2000: number): number {
  const t = daysSinceJ2000 / 36525;
  return LAHIRI_J2000 + RATE_PER_CENTURY * t + QUADRATIC * t * t;
}
