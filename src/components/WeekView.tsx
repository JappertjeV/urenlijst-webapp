import { format } from "date-fns";
import { eachDayOfWeek } from "@/lib/week";
import { workedMinutes, formatHours, formatHHMM } from "@/lib/time";
import type { EntryDTO, LocationDTO } from "@/types";

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const HOUR_PX = 32; // pixels per hour on the time axis
const AXIS_START = 0; // 00:00
const AXIS_END = 24 * 60; // full 24-hour day

const iso = (d: Date) => format(d, "yyyy-MM-dd"); // local day, matches entry dates

type Props = {
  anchor: Date;
  entries: EntryDTO[];
  locations: LocationDTO[];
  onDayClick: (date: string) => void;
};

export function WeekView({ anchor, entries, locations, onDayClick }: Props) {
  const days = eachDayOfWeek(anchor);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const today = iso(new Date());
  const weekKeys = new Set(days.map(iso));
  const visible = entries.filter((e) => weekKeys.has(e.date));

  // Show the full 24-hour day.
  const axisStart = AXIS_START;
  const axisEnd = AXIS_END;
  const gridHeight = ((axisEnd - axisStart) / 60) * HOUR_PX;
  const y = (minutes: number) => ((minutes - axisStart) / 60) * HOUR_PX;
  const hours: number[] = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hours.push(m);

  return (
    <div className="scroll-x">
      <div className="min-w-[680px]">
        {/* header row: weekday, date, day total */}
        <div className="mb-1 flex">
          <div className="w-12 shrink-0" />
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {days.map((day, i) => {
              const key = iso(day);
              const total = visible
                .filter((e) => e.date === key)
                .reduce(
                  (s, e) => s + workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
                  0,
                );
              const isToday = key === today;
              return (
                <div key={key} className="flex flex-col items-center">
                  <span className="text-xs text-ink-faint">{DAYS[i]}</span>
                  <span className={`text-base font-medium ${isToday ? "text-accent" : ""}`}>
                    {day.getDate()}
                  </span>
                  <span className="text-[11px] text-ink-soft">
                    {total ? formatHours(total) : "–"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* grid row: time axis + day columns */}
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
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {days.map((day, i) => {
              const key = iso(day);
              const dayEntries = visible.filter((e) => e.date === key);
              const isToday = key === today;
              const weekend = i >= 5;
              return (
                <button
                  key={key}
                  onClick={() => onDayClick(key)}
                  aria-label={`Uren op ${key}`}
                  className={`relative rounded-lg border ${
                    isToday ? "border-accent" : "border-surface-line"
                  } ${weekend ? "bg-surface-soft" : "bg-surface"}`}
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
                    const height = Math.max(y(e.endMinutes) - y(e.startMinutes), 16);
                    return (
                      <div
                        key={e.id}
                        className="absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight"
                        style={{
                          top: y(e.startMinutes),
                          height,
                          background: `${color}22`,
                          borderLeft: `3px solid ${color}`,
                          color,
                        }}
                      >
                        <div className="truncate font-medium">{loc?.name ?? "?"}</div>
                        <div className="opacity-80">
                          {formatHHMM(e.startMinutes)}–{formatHHMM(e.endMinutes)}
                        </div>
                        <div className="opacity-80">{formatHours(mins)}</div>
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
