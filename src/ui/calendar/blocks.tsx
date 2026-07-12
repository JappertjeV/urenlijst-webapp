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

  // Pauze als gestippeld/gearceerd blok midden in het urenblok. Hoogte schaalt
  // met de duur (met een minimum zodat het label leesbaar blijft). Verklaart
  // meteen het verschil tussen de bruto tijdsduur en de netto uren.
  const hasBreak = entry.breakMinutes > 0;
  const showBreakBand = hasBreak && height >= 48;
  const breakBandHeight = Math.min(
    Math.max((entry.breakMinutes / 1440) * GRID_PX, 16),
    height - 8,
  );
  const breakBandTop = (height - breakBandHeight) / 2;

  return (
    <button
      onClick={() => onOpen(entry)}
      className="absolute inset-x-0.5 flex flex-col items-start justify-start overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm transition active:brightness-90 lg:hover:brightness-95"
      style={{ top, height, backgroundColor: location.color }}
      aria-label={`${location.name}, ${formatHHMM(entry.startMinutes)} tot ${formatHHMM(entry.endMinutes)}${hasBreak ? `, ${entry.breakMinutes} minuten pauze` : ""}`}
    >
      <span className={`block truncate font-semibold ${compact ? "text-[10px] leading-tight" : "text-[11px]"}`}>
        {formatHHMM(entry.startMinutes)}–{formatHHMM(entry.endMinutes)}
      </span>
      {showLabel && !compact && !showBreakBand && (
        <span className="block truncate text-[11px] opacity-90">
          {location.name}
        </span>
      )}
      {showBreakBand && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 flex items-center justify-center"
          style={{
            top: breakBandTop,
            height: breakBandHeight,
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 3px, transparent 3px, transparent 7px)",
            borderTop: "1px dashed rgba(255,255,255,0.9)",
            borderBottom: "1px dashed rgba(255,255,255,0.9)",
          }}
        >
          <span className="rounded-full bg-white/90 px-1.5 py-px text-[9px] font-bold leading-none text-ink shadow-sm">
            {entry.breakMinutes}m
          </span>
        </span>
      )}
    </button>
  );
}

// De uurlijnen + labels die week- en dagweergave delen. Labels tonen enkel het
// uur (2-cijferig) zodat ze niet tegen de rand kruipen op smalle kolommen.
export function HourAxis() {
  return (
    <div className="relative border-r border-line" style={{ height: GRID_PX }}>
      {Array.from({ length: 24 }, (_, h) => (
        <span
          key={h}
          className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-ink-faint tabular-nums"
          style={{ top: h === 0 ? 9 : h * HOUR_PX }}
        >
          {String(h).padStart(2, "0")}
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
