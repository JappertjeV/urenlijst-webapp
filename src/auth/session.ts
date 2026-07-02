import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  assertSessionSecret,
  cookieSecure,
} from "./session-config";

export type SessionData = { userId?: string };

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

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}

export async function startSession(userId: string): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  await session.save();
}

export async function endSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
