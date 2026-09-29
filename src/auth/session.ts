import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getPasswordHash } from "@/data/users";
import {
  SESSION_COOKIE_NAME,
  assertSessionSecret,
  cookieSecure,
  fingerprintMatches,
  sessionFingerprint,
} from "./session-config";

// `fp` = vingerafdruk van de wachtwoord-hash (zie sessionFingerprint).
export type SessionData = { userId?: string; fp?: string };

export async function getSession() {
  // Eerst cookies lezen: tijdens statische prerendering laat Next de route
  // hierdoor uitwijken naar dynamische rendering vóórdat we SESSION_SECRET
  // aanraken — dat ontbreekt tijdens de Docker/CI-build en mag de build
  // niet laten crashen.
  const cookieStore = await cookies();
  const secret = assertSessionSecret(process.env.SESSION_SECRET);
  return getIronSession<SessionData>(cookieStore, {
    password: secret,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(process.env.NODE_ENV, process.env.ALLOW_INSECURE_COOKIE),
    },
  });
}

// Alleen een geldige sessie telt: de gebruiker moet nog bestaan en het
// wachtwoord mag sinds het inloggen niet gewijzigd zijn. Sessies van vóór
// deze controle hebben geen `fp` en vervallen dus eenmalig.
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session.userId || !session.fp) return null;
  const hash = await getPasswordHash(session.userId);
  if (!hash) return null;
  const expected = sessionFingerprint(hash, assertSessionSecret(process.env.SESSION_SECRET));
  return fingerprintMatches(session.fp, expected) ? session.userId : null;
}

export async function startSession(userId: string): Promise<void> {
  const hash = await getPasswordHash(userId);
  if (!hash) throw new Error("Gebruiker bestaat niet.");
  const session = await getSession();
  session.userId = userId;
  session.fp = sessionFingerprint(hash, assertSessionSecret(process.env.SESSION_SECRET));
  await session.save();
}

export async function endSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
