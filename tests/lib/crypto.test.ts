import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    const token = encryptSecret("app-specific-pw-1234");
    expect(token).not.toContain("app-specific-pw-1234");
    expect(decryptSecret(token)).toBe("app-specific-pw-1234");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("throws when the token is tampered with", () => {
    const token = encryptSecret("secret");
    const [iv, tag, data] = token.split(":");
    const tampered = [iv, tag, Buffer.from("x".repeat(data.length)).toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
