import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  assertSessionSecret,
  cookieSecure,
  fingerprintMatches,
  sessionFingerprint,
} from "@/auth/session-config";

describe("cookieSecure", () => {
  it("is secure in productie achter HTTPS", () => {
    expect(cookieSecure("production", undefined)).toBe(true);
    expect(cookieSecure("production", "false")).toBe(true);
  });

  it("schakelt Secure uit met ALLOW_INSECURE_COOKIE=true (homelab over HTTP)", () => {
    expect(cookieSecure("production", "true")).toBe(false);
  });

  it("is nooit secure in development", () => {
    expect(cookieSecure("development", undefined)).toBe(false);
    expect(cookieSecure("test", undefined)).toBe(false);
  });
});

describe("assertSessionSecret", () => {
  it("accepteert een geheim van minimaal 32 tekens", () => {
    const secret = "a".repeat(32);
    expect(assertSessionSecret(secret)).toBe(secret);
  });

  it("weigert een ontbrekend of te kort geheim met een Nederlandse uitleg", () => {
    expect(() => assertSessionSecret(undefined)).toThrow(/SESSION_SECRET/);
    expect(() => assertSessionSecret("kort")).toThrow(/32/);
  });
});

describe("SESSION_COOKIE_NAME", () => {
  it("blijft gelijk aan de oude app zodat bestaande sessies niet dubbel aanmaken", () => {
    expect(SESSION_COOKIE_NAME).toBe("urenlijst_session");
  });
});

describe("sessionFingerprint", () => {
  const secret = "x".repeat(32);

  it("is stabiel voor dezelfde hash en verschilt bij een andere hash of sleutel", () => {
    const a = sessionFingerprint("$2b$10$hashA", secret);
    expect(sessionFingerprint("$2b$10$hashA", secret)).toBe(a);
    expect(sessionFingerprint("$2b$10$hashB", secret)).not.toBe(a);
    expect(sessionFingerprint("$2b$10$hashA", "y".repeat(32))).not.toBe(a);
  });

  it("vergelijkt veilig, ook bij verschillende lengtes", () => {
    const a = sessionFingerprint("h", secret);
    expect(fingerprintMatches(a, a)).toBe(true);
    expect(fingerprintMatches(a, a.slice(1))).toBe(false);
    expect(fingerprintMatches(a, "")).toBe(false);
  });
});
