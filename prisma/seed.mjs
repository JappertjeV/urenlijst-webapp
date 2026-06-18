import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { username: "jasper" },
    update: {},
    create: { name: "Jasper", username: "jasper", passwordHash },
  });

  const defs = [
    { name: "Kantoor A'dam", color: "#378ADD", hourlyRate: 2800 },
    { name: "Thuiswerk", color: "#1D9E75", hourlyRate: 2500 },
    { name: "Klant Utrecht", color: "#BA7517", hourlyRate: 3200 },
  ];
  const locations = {};
  for (const d of defs) {
    const existing = await prisma.location.findFirst({
      where: { userId: user.id, name: d.name },
    });
    const loc =
      existing ??
      (await prisma.location.create({ data: { ...d, userId: user.id } }));
    locations[d.name] = loc.id;
  }

  const ka = locations["Kantoor A'dam"];
  const th = locations["Thuiswerk"];
  const kl = locations["Klant Utrecht"];
  const plan = [
    [15, ka, 540, 1020, 30, null],
    [16, ka, 540, 1020, 30, "Klantmeeting voorbereiding"],
    [17, th, 540, 960, 30, "Documentatie bijgewerkt"],
    [18, ka, 540, 1020, 30, "Sprint review + planning"],
    [19, kl, 540, 990, 30, "Implementatie nieuwe module afgerond"],
  ];
  await prisma.entry.deleteMany({ where: { userId: user.id } });
  for (const [day, locationId, s, e, b, note] of plan) {
    await prisma.entry.create({
      data: {
        userId: user.id,
        locationId,
        date: new Date(`2026-06-${String(day).padStart(2, "0")}T00:00:00.000Z`),
        startMinutes: s,
        endMinutes: e,
        breakMinutes: b,
        note,
      },
    });
  }
  console.log("Seeded demo profile 'jasper' (password: demo1234).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
