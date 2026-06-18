import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayView } from "@/components/DayView";
import type { EntryDTO, LocationDTO } from "@/types";

const locations: LocationDTO[] = [
  { id: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800 },
];
const entries: EntryDTO[] = [
  { id: "e1", date: "2026-06-18", locationId: "a", startMinutes: 540, endMinutes: 1020, breakMinutes: 30, note: "Sprint" },
  { id: "e2", date: "2026-06-17", locationId: "a", startMinutes: 540, endMinutes: 600, breakMinutes: 0, note: null },
];

describe("DayView", () => {
  it("renders only the anchored day's entry with its hours", () => {
    render(
      <DayView
        anchor={new Date("2026-06-18T12:00:00")}
        entries={entries}
        locations={locations}
        onDayClick={() => {}}
      />,
    );
    expect(screen.getByText("Kantoor")).toBeInTheDocument();
    expect(screen.getByText("Sprint")).toBeInTheDocument();
    expect(screen.getAllByText(/7,5u/).length).toBeGreaterThan(0);
  });
});
