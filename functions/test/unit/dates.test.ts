import { describe, expect, it } from "vitest";
import { periodKey, slotOf, utcSlotFor } from "../../src/lib/dates";

describe("periodKey", () => {
  const justAfterMidnightIst = new Date("2026-09-25T18:45:00Z"); // 00:15 IST on the 26th
  it("uses the user's local date", () => {
    expect(periodKey("today", "Asia/Kolkata", justAfterMidnightIst)).toBe("2026-09-26");
    expect(periodKey("today", "UTC", justAfterMidnightIst)).toBe("2026-09-25");
  });
  it("formats ISO weeks and months", () => {
    expect(periodKey("week", "Asia/Kolkata", justAfterMidnightIst)).toBe("2026-W39");
    expect(periodKey("month", "Asia/Kolkata", justAfterMidnightIst)).toBe("2026-09");
    expect(periodKey("week", "UTC", new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
});

describe("notification slots", () => {
  it("floors to the 15-minute grid", () => {
    expect(slotOf(new Date("2026-09-26T02:44:59Z"))).toBe("02:30");
    expect(slotOf(new Date("2026-09-26T02:45:00Z"))).toBe("02:45");
  });
  it("converts local hours to UTC slots, including half-hour zones", () => {
    const now = new Date("2026-09-26T00:00:00Z");
    expect(utcSlotFor(8, "Asia/Kolkata", now)).toBe("02:30");
    expect(utcSlotFor(8, "Asia/Kathmandu", now)).toBe("02:15");
    expect(utcSlotFor(8, "America/New_York", new Date("2026-07-01T12:00:00Z"))).toBe("12:00");
    expect(utcSlotFor(8, "America/New_York", new Date("2026-12-01T12:00:00Z"))).toBe("13:00");
  });
});
