import { prisma } from "@/lib/prisma";

export async function resetDb() {
  await prisma.entry.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
}
