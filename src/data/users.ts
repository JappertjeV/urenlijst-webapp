import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "@/auth/password";
import { LIMITS, newPasswordProblem } from "@/domain/validation";
import type { Account, Profile } from "@/types";

// Publiek (ook zonder login zichtbaar): alleen id en weergavenaam. De
// gebruikersnaam is de helft van de inloggegevens en hoort hier niet in —
// alles in deze lijst belandt in de RSC-payload van de profielkiezer.
export async function listProfiles(): Promise<Profile[]> {
  return prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Alleen voor de ingelogde gebruiker zelf (instellingenpagina).
export async function getAccount(userId: string): Promise<Account | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true },
  });
}

// De hash waarvan de sessie-vingerafdruk wordt afgeleid; null als de
// gebruiker niet (meer) bestaat.
export async function getPasswordHash(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  return user?.passwordHash ?? null;
}

export type CreateUserResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const USERNAME_TAKEN = "Die gebruikersnaam bestaat al.";

export async function createUser(input: {
  name: string;
  username: string;
  password: string;
}): Promise<CreateUserResult> {
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();

  if (!name || !username) {
    return { ok: false, error: "Vul een naam en gebruikersnaam in." };
  }
  if (name.length > LIMITS.name) {
    return { ok: false, error: `Naam mag maximaal ${LIMITS.name} tekens zijn.` };
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      ok: false,
      error: "Gebruikersnaam mag alleen letters, cijfers, punt, _ en - bevatten.",
    };
  }
  if (username.length < LIMITS.usernameMin || username.length > LIMITS.usernameMax) {
    return {
      ok: false,
      error: `Gebruikersnaam moet ${LIMITS.usernameMin} tot ${LIMITS.usernameMax} tekens zijn.`,
    };
  }
  const passwordProblem = newPasswordProblem(input.password);
  if (passwordProblem) return { ok: false, error: passwordProblem };

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { ok: false, error: USERNAME_TAKEN };
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({ data: { name, username, passwordHash } });
    return { ok: true, id: user.id };
  } catch (e) {
    // Twee gelijktijdige registraties met dezelfde naam: de unieke index
    // vangt de tweede, die mag dezelfde nette melding krijgen.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: USERNAME_TAKEN };
    }
    throw e;
  }
}

// Hash van een willekeurig wachtwoord, alleen om ook bij een onbekende
// gebruikersnaam een bcrypt-vergelijking te doen. Zonder die vergelijking
// antwoordt de login merkbaar sneller voor onbekende namen, en verraadt de
// responstijd welke gebruikersnamen bestaan.
let dummyHash: Promise<string> | undefined;

// Geeft het user-id bij een geldige combinatie, anders null.
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });
  if (!user) {
    await verifyPassword(password, await (dummyHash ??= hashPassword("dummy-wachtwoord")));
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return user.id;
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Gebruiker niet gevonden." };
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, error: "Huidig wachtwoord klopt niet." };
  }
  const problem = newPasswordProblem(newPassword);
  if (problem) return { ok: false, error: problem.replace("Wachtwoord", "Nieuw wachtwoord") };
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  return { ok: true };
}
