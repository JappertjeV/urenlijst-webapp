import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestDb } from "../helpers/db";

// Echte iron-session + echte database; alleen de cookie-opslag van Next is
// vervangen door een Map, zodat we een "gestolen" cookie kunnen hergebruiken.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (nameOrOptions: string | { name: string; value: string }, value?: string) => {
      if (typeof nameOrOptions === "string") jar.set(nameOrOptions, value ?? "");
      else jar.set(nameOrOptions.name, nameOrOptions.value);
    },
  }),
}));

import { getCurrentUserId, startSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-config";
import { changePassword, createUser } from "@/data/users";
import { prisma } from "@/data/prisma";

let cleanup: () => void;
beforeAll(() => {
  process.env.SESSION_SECRET = "s".repeat(32);
  cleanup = useTestDb();
});
afterAll(() => cleanup());
beforeEach(() => jar.clear());

async function user(username: string): Promise<string> {
  const result = await createUser({ name: username, username, password: "geheim123" });
  if (!result.ok) throw new Error(result.error);
  return result.id;
}

// Beveiligingsaudit 2026-09-29: iron-session is stateless, dus zonder extra
// controle bleef een gestolen cookie na een wachtwoordwissel 14 dagen geldig.
describe("sessie-intrekking", () => {
  it("herkent een verse sessie", async () => {
    const id = await user("sessie1");
    await startSession(id);
    expect(await getCurrentUserId()).toBe(id);
  });

  it("maakt een oude cookie ongeldig na een wachtwoordwissel", async () => {
    const id = await user("sessie2");
    await startSession(id);
    const stolen = jar.get(SESSION_COOKIE_NAME)!;

    expect(await changePassword(id, "geheim123", "nieuwgeheim456")).toEqual({ ok: true });
    jar.set(SESSION_COOKIE_NAME, stolen);
    expect(await getCurrentUserId()).toBeNull();

    // opnieuw inloggen geeft weer een geldige sessie
    await startSession(id);
    expect(await getCurrentUserId()).toBe(id);
  });

  it("maakt de sessie ongeldig als de gebruiker niet meer bestaat", async () => {
    const id = await user("sessie3");
    await startSession(id);
    await prisma.user.delete({ where: { id } });
    expect(await getCurrentUserId()).toBeNull();
  });

  it("accepteert geen sessie van vóór de vingerafdruk (alleen userId)", async () => {
    const id = await user("sessie4");
    const { getSession } = await import("@/auth/session");
    const session = await getSession();
    session.userId = id; // oud cookieformaat, zonder fp
    await session.save();
    expect(await getCurrentUserId()).toBeNull();
  });
});
