import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, decryptJson, encrypt, encryptJson } from "../../src/lib/crypto";

const key = randomBytes(32).toString("base64");

describe("PII encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("1995-03-10", key);
    expect(a).not.toBe(encrypt("1995-03-10", key));
    expect(decrypt(a, key)).toBe("1995-03-10");
    expect(decryptJson(encryptJson({ placeName: "पुणे" }, key), key)).toEqual({ placeName: "पुणे" });
  });
  it("rejects tampering and wrong keys", () => {
    const parts = encrypt("secret", key).split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decrypt(parts.join(":"), key)).toThrow();
    expect(() => decrypt(encrypt("secret", key), randomBytes(32).toString("base64"))).toThrow();
  });
});
