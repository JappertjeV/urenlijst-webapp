import { format } from "date-fns";
import { monthGridDays } from "@/lib/week";
import { workedMinutes, formatHours } from "@/lib/time";
import type { EntryDTO, LocationDTO } from "@/types";

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const iso = (d: Date) => format(d, "yyyy-MM-dd"); // local day, matches entry dates

type Props = {
  anchor: Date;
  entries: EntryDTO[];
  locations: LocationDTO[];
  onDayClick: (date: string) => void;
};

export function MonthView({ anchor, entries, locations, onDayClick }: Props) {
  const days = monthGridDays(anchor);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const month = anchor.getMonth();
  const today = iso(new Date());

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-ink-faint">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = iso(day);
          const dayEntries = entries.filter((e) => e.date === key);
          const total = dayEntries.reduce(
            (s, e) => s + workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
            0,
          );
          const isToday = key === today;
          const dim = day.getMonth() !== month;
          return (
            <button key={key} onClick={() => onDayClick(key)}
              className={`flex min-h-[66px] flex-col justify-between rounded-lg border p-1.5 text-left ${
                isToday ? "border-accent" : "border-surface-line"
              } ${dim ? "opacity-40" : ""}`}>
              <span className={`text-xs font-medium ${isToday ? "text-accent" : "text-ink-soft"}`}>
                {day.getDate()}
              </span>
              <div className="flex gap-1">
                {dayEntries.map((e) => (
                  <span key={e.id} className="h-2 w-2 rounded-full"
                    style={{ background: locById.get(e.locationId)?.color ?? "#888" }} />
                ))}
              </div>
              <span className="text-right text-[13px] font-medium">
                {total ? formatHours(total) : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
