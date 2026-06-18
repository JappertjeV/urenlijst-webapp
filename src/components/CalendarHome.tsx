"use client";

import { useMemo, useState } from "react";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { nl } from "date-fns/locale";
import { isoWeekNumber, weekRange } from "@/lib/week";
import { CalendarHeader } from "./CalendarHeader";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { DayView } from "./DayView";
import { EntryForm } from "./EntryForm";
import { DayDetail } from "./DayDetail";
import type { EntryDTO, LocationDTO } from "@/types";

type Props = {
  entries: EntryDTO[];
  locations: LocationDTO[];
  canEdit: boolean;
  showSalary: boolean;
};

export function CalendarHome({ entries, locations, canEdit, showSalary }: Props) {
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<"week" | "month" | "day">("week");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntryDTO | null>(null);
  const [adding, setAdding] = useState(false);

  const title = useMemo(() => {
    if (view === "month") return format(anchor, "LLLL yyyy", { locale: nl });
    if (view === "day") {
      const s = format(anchor, "EEEE d MMMM yyyy", { locale: nl });
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    const { start, end } = weekRange(anchor);
    return `${format(start, "d", { locale: nl })}–${format(end, "d MMMM yyyy", { locale: nl })} · wk ${isoWeekNumber(anchor)}`;
  }, [anchor, view]);

  const step = (dir: number) =>
    setAnchor((d) =>
      view === "week"
        ? addWeeks(d, dir)
        : view === "month"
          ? addMonths(d, dir)
          : addDays(d, dir),
    );

  const dayEntries = (date: string) => entries.filter((e) => e.date === date);

  return (
    <div>
      <CalendarHeader
        title={title} view={view}
        onPrev={() => step(-1)} onNext={() => step(1)}
        onView={setView}
        onAdd={() => { setAdding(true); setEditing(null); setOpenDay(format(anchor, "yyyy-MM-dd")); }}
        canAdd={canEdit}
      />
      {view === "week" ? (
        <WeekView anchor={anchor} entries={entries} locations={locations} onDayClick={setOpenDay} />
      ) : view === "month" ? (
        <MonthView anchor={anchor} entries={entries} locations={locations} onDayClick={setOpenDay} />
      ) : (
        <DayView anchor={anchor} entries={entries} locations={locations} onDayClick={setOpenDay} />
      )}

      {openDay && (
        <div className="mt-6 rounded-card border border-surface-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">{openDay}</h2>
            <button onClick={() => { setOpenDay(null); setAdding(false); setEditing(null); }}
              className="text-sm text-ink-soft">Sluiten</button>
          </div>
          {(adding || editing) ? (
            <EntryForm date={openDay} locations={locations} entry={editing ?? undefined}
              onDone={() => { setAdding(false); setEditing(null); }} />
          ) : (
            <>
              <DayDetail date={openDay} entries={dayEntries(openDay)} locations={locations}
                canEdit={canEdit} showSalary={showSalary} onEdit={(e) => setEditing(e)} />
              {canEdit && (
                <button onClick={() => setAdding(true)}
                  className="mt-3 rounded-md border border-surface-line px-3 py-1.5 text-sm">+ Urenblok</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
