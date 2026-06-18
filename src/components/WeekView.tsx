import { format } from "date-fns";
import { eachDayOfWeek } from "@/lib/week";
import { workedMinutes, formatHours } from "@/lib/time";
import type { EntryDTO, LocationDTO } from "@/types";

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function tint(hex: string): string {
  return `${hex}22`;
}
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

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day, i) => {
        const key = iso(day);
        const dayEntries = entries.filter((e) => e.date === key);
        const total = dayEntries.reduce(
          (s, e) => s + workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
          0,
        );
        const isToday = key === today;
        return (
          <button
            key={key}
            onClick={() => onDayClick(key)}
            className={`flex min-h-[160px] flex-col rounded-lg border p-2 text-left ${
              isToday ? "border-accent" : "border-surface-line"
            } ${i >= 5 ? "bg-surface-soft" : "bg-surface"}`}
          >
            <div className="mb-2 flex flex-col items-center">
              <span className="text-xs text-ink-faint">{DAYS[i]}</span>
              <span className={`text-base font-medium ${isToday ? "text-accent" : ""}`}>
                {day.getDate()}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {dayEntries.map((e) => {
                const loc = locById.get(e.locationId);
                const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
                return (
                  <div key={e.id} className="rounded-md px-1.5 py-1 text-xs font-medium"
                    style={{ background: tint(loc?.color ?? "#888"), color: loc?.color ?? "#333" }}>
                    <div className="truncate">{loc?.name ?? "?"}</div>
                    <div>{formatHours(mins)}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 text-center text-xs font-medium text-ink-soft">
              {total ? formatHours(total) : "–"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
