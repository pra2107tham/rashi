import { describe, expect, it } from "vitest";
import { toApiMessages } from "../../src/services/chat";

describe("toApiMessages", () => {
  it("drops failed turns, merges runs and never starts with the assistant", () => {
    expect(
      toApiMessages([
        { role: "assistant", content: "welcome" },
        { role: "user", content: "a" },
        { role: "user", content: "lost", failed: true },
        { role: "user", content: "b" },
        { role: "assistant", content: "c" },
        { role: "user", content: "d" },
      ]),
    ).toEqual([
      { role: "user", content: "a\n\nb" },
      { role: "assistant", content: "c" },
      { role: "user", content: "d" },
    ]);
  });
});
