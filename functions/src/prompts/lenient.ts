import { z } from "zod";

/*
 * Schema helpers that repair small model slips instead of failing the whole generation. The JSON
 * schema sent to the model stays strict (z.preprocess renders as its target schema); only the
 * parsing of the reply is forgiving. Typical slips, mostly in Hindi output: a translated enum value
 * (करियर for career), Devanagari digits (५), numbers as strings, over-long one-liners.
 */

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** An enum that maps unknown or translated values through `aliases`, else to `fallback`. */
export function looseEnum<const T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
  aliases: Record<string, T[number]> = {},
) {
  return z.preprocess((v) => {
    if (typeof v !== "string") return fallback;
    const key = v.trim().toLowerCase();
    if ((values as readonly string[]).includes(key)) return key;
    return aliases[key] ?? fallback;
  }, z.enum(values));
}

/** An integer that also accepts "7", "७" or 7.0, clamped into range. */
export function looseInt(min: number, max: number) {
  return z.preprocess((v) => {
    const n = typeof v === "string"
      ? Number(v.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d))).replace(/[^\d.-]/g, ""))
      : v;
    if (typeof n !== "number" || !Number.isFinite(n)) return v;
    return Math.min(max, Math.max(min, Math.round(n)));
  }, z.number().int().min(min).max(max));
}

/** A string cut back to `max` characters at a word boundary. */
export function clippedString(max: number) {
  return z.preprocess((v) => {
    if (typeof v !== "string" || v.length <= max) return v;
    const cut = v.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }, z.string());
}

/** An array trimmed to at most `max` items that must still have at least `min`. */
export function boundedArray<S extends z.ZodType>(item: S, min: number, max: number) {
  return z.preprocess(
    (v) => (Array.isArray(v) ? v.slice(0, max) : v),
    z.array(item).refine((a) => a.length >= min, `at least ${min} items required`),
  );
}
