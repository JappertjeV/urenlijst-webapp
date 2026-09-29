import { Prisma, PrismaClient } from "@prisma/client";

// Lazy singleton: de client wordt pas aangemaakt bij het eerste gebruik.
// Zo kan een test eerst DATABASE_URL naar een wegwerpbestand wijzen, en
// hergebruikt dev-hot-reload dezelfde verbinding.
const globalForPrisma = globalThis as unknown as { prismaClient?: PrismaClient };

function client(): PrismaClient {
  return (globalForPrisma.prismaClient ??= new PrismaClient());
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const value = Reflect.get(client(), prop);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});

// Voor schrijfacties waarbij een controle (bv. overlap) en het schrijven
// samen atomair moeten zijn. SQLite kent alleen serializable isolatie.
export function writeTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
