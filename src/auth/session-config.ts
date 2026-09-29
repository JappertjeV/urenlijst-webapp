// Pure sessie-configuratie, los van next/headers zodat dit unit-testbaar is.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "urenlijst_session";

// Secure-cookies vereisen HTTPS. Op een homelab achter gewoon HTTP zet je
// ALLOW_INSECURE_COOKIE=true, anders laat de browser het sessiecookie vallen
// en "blijft" inloggen stilletjes nooit hangen.
export function cookieSecure(
  nodeEnv: string | undefined,
  allowInsecureCookie: string | undefined,
): boolean {
  return nodeEnv === "production" && allowInsecureCookie !== "true";
}

export function assertSessionSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET ontbreekt of is te kort (minimaal 32 tekens). " +
        "Genereer er een met: openssl rand -base64 32",
    );
  }
  return secret;
}

// Vingerafdruk van de wachtwoord-hash die in de sessie meegaat. Verandert
// het wachtwoord (of bestaat de gebruiker niet meer), dan klopt de afdruk
// niet meer en is elke oude sessie direct ongeldig — ook een gestolen
// cookie. iron-session is stateless; zonder dit bleef zo'n cookie tot het
// verloopt (14 dagen) gewoon werken.
export function sessionFingerprint(passwordHash: string, secret: string): string {
  return createHmac("sha256", secret).update(passwordHash).digest("base64url");
}

export function fingerprintMatches(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
