import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getSession } from "./session";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function login(
  username: string,
  password: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return false;
  if (!(await verifyPassword(password, user.passwordHash))) return false;
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return true;
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}
