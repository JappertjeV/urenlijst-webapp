import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { Profile } from "@/types";

export async function listProfiles(): Promise<Profile[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
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
