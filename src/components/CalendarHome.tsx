"use client";

import { useEffect, useMemo, useState } from "react";
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
      return cap(format(anchor, "EEEE d MMMM yyyy", { locale: nl }));
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

  const closeDay = () => {
    setOpenDay(null);
    setAdding(false);
    setEditing(null);
  };

  // Close the modal on Escape.
  useEffect(() => {
    if (!openDay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDay(null);
        setAdding(false);
        setEditing(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDay]);

  const openDayLabel = openDay
    ? cap(format(new Date(`${openDay}T00:00:00`), "EEEE d MMMM yyyy", { locale: nl }))
    : "";

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
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={closeDay}
          role="dialog"
          aria-modal="true"
          aria-label={`Uren op ${openDayLabel}`}
        >
          <div
            className="my-4 w-full max-w-lg rounded-card border border-surface-line bg-surface p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium">
                {editing ? "Uren bewerken" : adding ? "Uren toevoegen" : openDayLabel}
              </h2>
              <button onClick={closeDay} aria-label="Sluiten" className="text-sm text-ink-soft">
                Sluiten
              </button>
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
        </div>
      )}
    </div>
  );
}
