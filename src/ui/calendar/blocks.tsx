"use client";

import { formatHHMM } from "@/domain/time";
import { locationOf } from "@/ui/entries/entry-helpers";
import type { EntryDTO, LocationDTO } from "@/types";

export const HOUR_PX = 44; // hoogte van één uur in de tijdrasters
export const GRID_PX = 24 * HOUR_PX;

// Een gekleurd urenblok, absoluut gepositioneerd op de 24-uursas.
export function TimeBlock({
  entry,
  locations,
  onOpen,
  showLabel = true,
}: {
  entry: EntryDTO;
  locations: LocationDTO[];
  onOpen: (entry: EntryDTO) => void;
  showLabel?: boolean;
}) {
  const location = locationOf(entry, locations);
  const top = (entry.startMinutes / 1440) * GRID_PX;
  const height = Math.max(
    ((entry.endMinutes - entry.startMinutes) / 1440) * GRID_PX,
    18,
  );
  const compact = height < 34;

  return (
    <button
      onClick={() => onOpen(entry)}
      className="absolute inset-x-0.5 flex flex-col items-start justify-start overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm transition active:brightness-90 lg:hover:brightness-95"
      style={{ top, height, backgroundColor: location.color }}
      aria-label={`${location.name}, ${formatHHMM(entry.startMinutes)} tot ${formatHHMM(entry.endMinutes)}`}
    >
      <span className={`block truncate font-semibold ${compact ? "text-[10px] leading-tight" : "text-[11px]"}`}>
        {formatHHMM(entry.startMinutes)}–{formatHHMM(entry.endMinutes)}
      </span>
      {showLabel && !compact && (
        <span className="block truncate text-[11px] opacity-90">
          {location.name}
        </span>
      )}
    </button>
  );
}

// De uurlijnen + labels die week- en dagweergave delen.
export function HourAxis() {
  return (
    <div className="relative border-r border-line" style={{ height: GRID_PX }}>
      {Array.from({ length: 24 }, (_, h) => (
        <span
          key={h}
          className="absolute right-1.5 -translate-y-1/2 text-[10px] text-ink-faint tabular-nums"
          style={{ top: h === 0 ? 6 : h * HOUR_PX }}
        >
          {String(h).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  );
}

export function HourLines() {
  return (
    <>
      {Array.from({ length: 23 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-line/70"
          style={{ top: (i + 1) * HOUR_PX }}
        />
      ))}
    </>
  );
}
