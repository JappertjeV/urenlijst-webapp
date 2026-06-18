import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = { userId?: string };

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "urenlijst_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  // Read cookies first: during static prerendering this makes Next bail the
  // route out to dynamic rendering before we touch SESSION_SECRET, which is
  // absent at build time (so the build does not fail in Docker / CI).
  const cookieStore = await cookies();
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET ontbreekt of is te kort (minimaal 32 tekens). " +
        "Genereer er een met: openssl rand -base64 32",
    );
  }
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
