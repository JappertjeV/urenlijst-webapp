import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import type { Profile } from "@/types";

export async function listProfiles(): Promise<Profile[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true },
  });
}

export type CreateUserResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

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
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      ok: false,
      error: "Gebruikersnaam mag alleen letters, cijfers, punt, _ en - bevatten.",
    };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "Wachtwoord moet minimaal 6 tekens zijn." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { ok: false, error: "Die gebruikersnaam bestaat al." };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name, username, passwordHash },
  });
  return { ok: true, id: user.id };
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
  if (newPassword.length < 6) {
    return { ok: false, error: "Nieuw wachtwoord moet minimaal 6 tekens zijn." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  return { ok: true };
}
