import { DateTime } from "luxon";
import type { Period } from "../config";

/** Cache key component for a reading period, evaluated in the user's timezone. */
export function periodKey(period: Period, tz: string, now: Date = new Date()): string {
  const local = DateTime.fromJSDate(now, { zone: tz });
  switch (period) {
    case "today": return local.toFormat("yyyy-MM-dd");
    case "week": return local.toFormat("kkkk-'W'WW");
    case "month": return local.toFormat("yyyy-MM");
  }
}

/** Human description of the period for prompts, e.g. "Saturday, 26 September 2026". */
export function describePeriod(period: Period, tz: string, now: Date = new Date()): string {
  const local = DateTime.fromJSDate(now, { zone: tz });
  switch (period) {
    case "today": return local.toFormat("cccc, d LLLL yyyy");
    case "week": {
      const start = local.startOf("week");
      return `week of ${start.toFormat("d LLLL")} – ${start.plus({ days: 6 }).toFormat("d LLLL yyyy")}`;
    }
    case "month": return local.toFormat("LLLL yyyy");
  }
}

/** Minutes are floored to the scheduler's 15-minute grid. */
export function slotOf(date: Date): string {
  const d = DateTime.fromJSDate(date, { zone: "utc" });
  return `${d.toFormat("HH")}:${String(Math.floor(d.minute / 15) * 15).padStart(2, "0")}`;
}

/**
 * The UTC "HH:mm" slot at which `localHour` next occurs in `tz` (on or after `now`'s local date).
 * Recomputed after each send so DST shifts are picked up.
 */
export function utcSlotFor(localHour: number, tz: string, now: Date = new Date()): string {
  const local = DateTime.fromJSDate(now, { zone: tz }).set({ hour: localHour, minute: 0, second: 0, millisecond: 0 });
  return slotOf(local.toUTC().toJSDate());
}

export function isValidZone(tz: string): boolean {
  return DateTime.local().setZone(tz).isValid;
}
