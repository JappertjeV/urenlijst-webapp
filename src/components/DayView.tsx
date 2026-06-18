import { format } from "date-fns";
import { workedMinutes, formatHours, formatHHMM } from "@/lib/time";
import type { EntryDTO, LocationDTO } from "@/types";

const HOUR_PX = 40; // pixels per hour (single full-width day column)
const AXIS_START = 0; // 00:00
const AXIS_END = 24 * 60; // full 24-hour day

const iso = (d: Date) => format(d, "yyyy-MM-dd"); // local day, matches entry dates

type Props = {
  anchor: Date;
  entries: EntryDTO[];
  locations: LocationDTO[];
  onDayClick: (date: string) => void;
};

export function DayView({ anchor, entries, locations, onDayClick }: Props) {
  const key = iso(anchor);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const dayEntries = entries.filter((e) => e.date === key);
  const gridHeight = ((AXIS_END - AXIS_START) / 60) * HOUR_PX;
  const y = (minutes: number) => ((minutes - AXIS_START) / 60) * HOUR_PX;
  const hours: number[] = [];
  for (let m = AXIS_START; m <= AXIS_END; m += 60) hours.push(m);
  const total = dayEntries.reduce(
    (s, e) => s + workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
    0,
  );

  return (
    <div>
      <div className="mb-2 text-sm text-ink-soft">
        {total ? `${formatHours(total)} gewerkt` : "Geen uren op deze dag"}
      </div>
      <div className="flex py-1">
        <div className="w-12 shrink-0">
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((m) => (
              <span
                key={m}
                className="absolute right-1 -translate-y-1/2 text-[11px] text-ink-faint"
                style={{ top: y(m) }}
              >
                {formatHHMM(m)}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onDayClick(key)}
          aria-label={`Uren op ${key}`}
          className="relative flex-1 rounded-lg border border-surface-line bg-surface"
          style={{ height: gridHeight }}
        >
          {hours.slice(1).map((m) => (
            <span
              key={m}
              className="absolute inset-x-0 border-t border-surface-line/60"
              style={{ top: y(m) }}
            />
          ))}
          {dayEntries.map((e) => {
            const loc = locById.get(e.locationId);
            const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
            const color = loc?.color ?? "#888780";
            const height = Math.max(y(e.endMinutes) - y(e.startMinutes), 18);
            return (
              <div
                key={e.id}
                className="absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs leading-tight"
                style={{
                  top: y(e.startMinutes),
                  height,
                  background: `${color}22`,
                  borderLeft: `3px solid ${color}`,
                  color,
                }}
              >
                <div className="font-medium">{loc?.name ?? "?"}</div>
                <div className="opacity-80">
                  {formatHHMM(e.startMinutes)}–{formatHHMM(e.endMinutes)} · {formatHours(mins)}
                </div>
                {e.note && <div className="truncate opacity-70">{e.note}</div>}
              </div>
            );
          })}
        </button>
      </div>
    </div>
  );
}
