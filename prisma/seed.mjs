// Demo-seed (optioneel, via SEED_ON_START=true): maakt een demo-profiel met
// werklocaties, een tariefwijziging en wat uren in de huidige week.
// Idempotent: doet niets als de demo-gebruiker al bestaat.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function utcDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "jasper" } });
  if (existing) {
    console.log("Seed: demo-gebruiker bestaat al, niets te doen.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Jasper",
      username: "jasper",
      passwordHash: await bcrypt.hash("demo1234", 10),
    },
  });

  const kantoor = await prisma.location.create({
    data: { userId: user.id, name: "Kantoor", color: "#4f83d6", hourlyRate: 2500 },
  });
  const thuis = await prisma.location.create({
    data: { userId: user.id, name: "Thuiswerk", color: "#4d9e77", hourlyRate: 2200 },
  });

  // Tariefwijziging: vanaf de 1e van deze maand geldt een hoger kantoortarief.
  const now = new Date();
  await prisma.locationRate.create({
    data: {
      locationId: kantoor.id,
      hourlyRate: 2650,
      validFrom: utcDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    },
  });

  // Ma t/m wo van deze week (weken beginnen op maandag).
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const day = (offset) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return utcDay(d);
  };

  await prisma.entry.createMany({
    data: [
      {
        userId: user.id, locationId: kantoor.id, date: day(0),
        startMinutes: 9 * 60, endMinutes: 17 * 60, breakMinutes: 30, note: null,
      },
      {
        userId: user.id, locationId: thuis.id, date: day(1),
        startMinutes: 8 * 60 + 30, endMinutes: 16 * 60 + 30, breakMinutes: 30, note: "Thuis gewerkt",
      },
      {
        userId: user.id, locationId: kantoor.id, date: day(2),
        startMinutes: 9 * 60, endMinutes: 13 * 60, breakMinutes: 0, note: "Halve dag",
      },
    ],
  });

  console.log("Seed: demo-profiel aangemaakt (jasper / demo1234).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
