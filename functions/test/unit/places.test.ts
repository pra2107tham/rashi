import { describe, expect, it } from "vitest";
import { searchPlaces } from "../../src/services/places";

describe("searchPlaces", () => {
  it("finds exact matches first, with the Indian state", () => {
    const [first] = searchPlaces("Pune");
    expect(first).toMatchObject({ name: "Pune", region: "Maharashtra", country: "IN" });
    expect(first.lat).toBeCloseTo(18.52, 1);
  });

  it("ignores accents and spaces, and knows old and new names", () => {
    expect(searchPlaces("dehradun")[0].name).toBe("Dehra Dun");
    expect(searchPlaces("Bangalore")[0].name).toBe("Bengaluru");
    expect(searchPlaces("gurugram")[0].region).toBe("Haryana");
    expect(searchPlaces("kochi")[0].region).toBe("Kerala");
  });

  it("ranks prefix matches by population and prefers India on ties", () => {
    const names = searchPlaces("nag").map((p) => p.name);
    expect(names[0]).toBe("Nagpur");
  });

  it("includes big cities abroad for people born outside India", () => {
    expect(searchPlaces("London")[0]).toMatchObject({ country: "GB", region: "United Kingdom" });
  });

  it("returns nothing for one-letter queries", () => {
    expect(searchPlaces("p")).toEqual([]);
  });
});
