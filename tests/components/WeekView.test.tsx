import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekView } from "@/components/WeekView";
import type { EntryDTO, LocationDTO } from "@/types";

const locations: LocationDTO[] = [
  { id: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800 },
];
const entries: EntryDTO[] = [
  { id: "e1", date: "2026-06-18", locationId: "a", startMinutes: 540, endMinutes: 1020, breakMinutes: 30, note: null },
];

describe("WeekView", () => {
  it("renders the location name and hours for a worked day", () => {
    render(
      <WeekView
        anchor={new Date("2026-06-18T12:00:00")}
        entries={entries}
        locations={locations}
        onDayClick={() => {}}
      />,
    );
    expect(screen.getByText("Kantoor")).toBeInTheDocument();
    expect(screen.getAllByText("7,5u")[0]).toBeInTheDocument();
  });
});
