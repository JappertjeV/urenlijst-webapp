// Minimal iCalendar (RFC 5545) generation for a single work-hours event.

export type ICalEvent = {
  uid: string;
  date: string; // yyyy-MM-dd
  startMinutes: number;
  endMinutes: number;
  summary: string;
  description?: string | null;
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

// Floating local date-time "YYYYMMDDTHHMMSS" (no zone → shown in the viewer's
// local time, which is what we want for wall-clock work hours).
export function localStamp(date: string, minutes: number): string {
  const [y, m, d] = date.split("-");
  return `${y}${m}${d}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

// UTC timestamp "YYYYMMDDTHHMMSSZ" for DTSTAMP.
export function utcStamp(now: Date = new Date()): string {
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

export function buildEventICS(event: ICalEvent, now?: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//urenlijst//iCloud export//NL",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(event.date, event.startMinutes)}`,
    `DTEND:${localStamp(event.date, event.endMinutes)}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
