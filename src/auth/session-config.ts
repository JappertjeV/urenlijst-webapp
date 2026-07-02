// Pure sessie-configuratie, los van next/headers zodat dit unit-testbaar is.

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
