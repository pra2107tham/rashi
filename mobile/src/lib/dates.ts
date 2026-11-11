/** "14081998" → "14 / 08 / 1998" while typing. */
export function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(" / ");
}

/** "14 / 08 / 1998" → "1998-08-14" if it's a real past date after 1900, else null. */
export function parseDate(masked: string): string | null {
  const d = masked.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const day = +d.slice(0, 2), month = +d.slice(2, 4), year = +d.slice(4, 8);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || date.getTime() > Date.now()) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d} / ${m} / ${y}`;
}

/** "0730" → "07:30". */
export function maskTime(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** 12-hour "07:30" + PM → "19:30", or null if invalid. */
export function parseTime(masked: string, pm: boolean): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(masked);
  if (!m) return null;
  const h = +m[1], min = +m[2];
  if (h < 1 || h > 12 || min > 59) return null;
  const h24 = (h % 12) + (pm ? 12 : 0);
  return `${String(h24).padStart(2, "0")}:${m[2]}`;
}

export function to12h(hhmm: string): { time: string; pm: boolean } {
  const [h, m] = hhmm.split(":").map(Number);
  return { time: `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")}`, pm: h >= 12 };
}
