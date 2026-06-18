import { createDAVClient } from "tsdav";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { buildEventICS } from "@/lib/ical";
import { workedMinutes, formatHours } from "@/lib/time";

const ICLOUD_URL = "https://caldav.icloud.com";

export type CalendarOption = { url: string; name: string };
export type ICloudStatus =
  | { connected: false }
  | { connected: true; appleId: string; calendarName: string | null; calendarUrl: string | null };

// App-specific passwords are shown by Apple in groups (xxxx-xxxx-xxxx-xxxx);
// users often paste them with the dashes/spaces, so normalise.
function normalisePassword(pw: string): string {
  return pw.trim();
}

async function davClient(username: string, password: string) {
  return createDAVClient({
    serverUrl: ICLOUD_URL,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

async function fetchEventCalendars(
  appleId: string,
  password: string,
): Promise<CalendarOption[]> {
  const client = await davClient(appleId, password);
  const calendars = await client.fetchCalendars();
  return calendars
    .filter((c) => !c.components || c.components.includes("VEVENT"))
    .map((c) => ({
      url: c.url,
      name:
        typeof c.displayName === "string" && c.displayName ? c.displayName : "Agenda",
    }));
}

export async function connectICloud(
  userId: string,
  appleIdRaw: string,
  appPasswordRaw: string,
): Promise<{ ok: true; calendars: CalendarOption[] } | { ok: false; error: string }> {
  const appleId = appleIdRaw.trim();
  const appPassword = normalisePassword(appPasswordRaw);
  if (!appleId || !appPassword) {
    return { ok: false, error: "Vul je Apple ID en app-specifiek wachtwoord in." };
  }
  let calendars: CalendarOption[];
  try {
    calendars = await fetchEventCalendars(appleId, appPassword);
  } catch {
    return {
      ok: false,
      error:
        "Verbinden met iCloud mislukt. Controleer je Apple ID en het app-specifieke wachtwoord.",
    };
  }
  await prisma.caldavConfig.upsert({
    where: { userId },
    update: {
      appleId,
      passwordEnc: encryptSecret(appPassword),
      calendarUrl: null,
      calendarName: null,
    },
    create: { userId, appleId, passwordEnc: encryptSecret(appPassword) },
  });
  return { ok: true, calendars };
}

export async function listICloudCalendars(
  userId: string,
): Promise<{ ok: true; calendars: CalendarOption[] } | { ok: false; error: string }> {
  const cfg = await prisma.caldavConfig.findUnique({ where: { userId } });
  if (!cfg) return { ok: false, error: "Nog niet verbonden met iCloud." };
  try {
    const calendars = await fetchEventCalendars(cfg.appleId, decryptSecret(cfg.passwordEnc));
    return { ok: true, calendars };
  } catch {
    return { ok: false, error: "Ophalen van agenda's mislukt." };
  }
}

export async function selectICloudCalendar(userId: string, url: string, name: string) {
  await prisma.caldavConfig.update({
    where: { userId },
    data: { calendarUrl: url, calendarName: name },
  });
}

export async function disconnectICloud(userId: string) {
  await prisma.caldavConfig.deleteMany({ where: { userId } });
}

export async function getICloudStatus(userId: string): Promise<ICloudStatus> {
  const cfg = await prisma.caldavConfig.findUnique({ where: { userId } });
  if (!cfg) return { connected: false };
  return {
    connected: true,
    appleId: cfg.appleId,
    calendarName: cfg.calendarName,
    calendarUrl: cfg.calendarUrl,
  };
}

export async function uploadHours(
  userId: string,
): Promise<{ ok: true; uploaded: number; failed: number } | { ok: false; error: string }> {
  const cfg = await prisma.caldavConfig.findUnique({ where: { userId } });
  if (!cfg) return { ok: false, error: "Nog niet verbonden met iCloud." };
  if (!cfg.calendarUrl) {
    return { ok: false, error: "Kies eerst een agenda om naar te uploaden." };
  }

  const password = decryptSecret(cfg.passwordEnc);
  const auth = "Basic " + Buffer.from(`${cfg.appleId}:${password}`).toString("base64");
  const base = cfg.calendarUrl.endsWith("/") ? cfg.calendarUrl : `${cfg.calendarUrl}/`;

  const entries = await prisma.entry.findMany({
    where: { userId },
    include: { location: true },
    orderBy: { date: "asc" },
  });

  let uploaded = 0;
  let failed = 0;
  for (const e of entries) {
    const date = e.date.toISOString().slice(0, 10);
    const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
    const uid = `urenlijst-${e.id}@urenlijst`;
    const ics = buildEventICS({
      uid,
      date,
      startMinutes: e.startMinutes,
      endMinutes: e.endMinutes,
      summary: `${e.location.name} (${formatHours(mins)})`,
      description: e.note,
    });
    try {
      const res = await fetch(`${base}${uid}.ics`, {
        method: "PUT",
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          Authorization: auth,
        },
        body: ics,
      });
      if (res.ok) uploaded++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { ok: true, uploaded, failed };
}
