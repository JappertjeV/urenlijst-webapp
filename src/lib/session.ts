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
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET ontbreekt of is te kort (minimaal 32 tekens). " +
        "Genereer er een met: openssl rand -base64 32",
    );
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
