import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  assertSessionSecret,
  cookieSecure,
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
