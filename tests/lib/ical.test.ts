import { describe, expect, it } from "vitest";
import { buildEventICS, localStamp, utcStamp } from "@/lib/ical";

describe("localStamp", () => {
  it("formats a floating local date-time", () => {
    expect(localStamp("2026-06-18", 540)).toBe("20260618T090000");
    expect(localStamp("2026-06-18", 1020)).toBe("20260618T170000");
  });
});

describe("utcStamp", () => {
  it("formats a UTC timestamp with Z", () => {
    expect(utcStamp(new Date("2026-06-18T12:30:45Z"))).toBe("20260618T123045Z");
  });
});

describe("buildEventICS", () => {
  const ics = buildEventICS(
    {
      uid: "urenlijst-e1@urenlijst",
      date: "2026-06-18",
      startMinutes: 540,
      endMinutes: 1020,
      summary: "Kantoor A'dam (7,5u)",
      description: "Sprint review; planning",
    },
    new Date("2026-06-18T12:00:00Z"),
  );

  it("wraps a single VEVENT in a VCALENDAR", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("includes the UID, times and summary", () => {
    expect(ics).toContain("UID:urenlijst-e1@urenlijst");
    expect(ics).toContain("DTSTART:20260618T090000");
    expect(ics).toContain("DTEND:20260618T170000");
    expect(ics).toContain("SUMMARY:Kantoor A'dam (7\\,5u)");
  });

  it("escapes semicolons in the description", () => {
    expect(ics).toContain("DESCRIPTION:Sprint review\\; planning");
  });

  it("uses CRLF line endings", () => {
    expect(ics).toContain("\r\n");
  });
});
