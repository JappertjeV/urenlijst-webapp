import { prisma } from "@/lib/prisma";
import type { Profile } from "@/types";

export async function listProfiles(): Promise<Profile[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });
}
