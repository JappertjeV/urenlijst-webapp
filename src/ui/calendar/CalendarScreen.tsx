"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEUR } from "@/domain/money";
import { formatHHMM, formatHours } from "@/domain/time";
import { EntryForm } from "@/ui/entries/EntryForm";
import { EntryList } from "@/ui/entries/EntryList";
import {
  entryCents,
  entryMinutes,
  locationOf,
} from "@/ui/entries/entry-helpers";
import { Sheet } from "@/ui/shell/Sheet";
import { GRID_PX, HourAxis, HourLines, TimeBlock } from "@/ui/calendar/blocks";
import type { EntryDTO, LocationDTO } from "@/types";

export type CalendarDay = {
  key: string; // yyyy-MM-dd
  dayNumber: number;
  weekdayShort: string; // ma, di, …
  inMonth: boolean; // voor de maandweergave
  href: string; // link naar de dagweergave (server-side opgebouwd)
};

// Alleen-lezen detail voor bezoekers (geen formulier, geen tarieven).
function EntryDetail({
  entry,
  locations,
}: {
  entry: EntryDTO;
  locations: LocationDTO[];
}) {
  const location = locationOf(entry, locations);
  return (
    <div className="flex flex-col gap-3 text-[15px]">
      <p className="flex items-center gap-2 font-medium">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: location.color }}
        />
        {location.name}
      </p>
      <p className="tabular-nums">
        {formatHHMM(entry.startMinutes)}–{formatHHMM(entry.endMinutes)}
        {entry.breakMinutes > 0 && ` · ${entry.breakMinutes} min pauze`}
        {` · ${formatHours(entryMinutes(entry))}`}
      </p>
      {entry.note && <p className="text-ink-soft">{entry.note}</p>}
    </div>
  );
}

export function CalendarScreen({
  view,
  days,
  todayKey,
  selectedKey,
  entries,
  locations,
  canEdit,
}: {
  view: "week" | "maand" | "dag";
  days: CalendarDay[];
  todayKey: string;
  selectedKey: string;
  entries: EntryDTO[];
  locations: LocationDTO[];
  canEdit: boolean;
}) {
  const [opened, setOpened] = useState<EntryDTO | null>(null);
  const byDay = new Map<string, EntryDTO[]>();
  for (const e of entries) {
    byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  }

  const selectedEntries = byDay.get(selectedKey) ?? [];

  return (
    <>
      {view === "week" && (
        <div className="card overflow-hidden">
          {/* Geen horizontale scroller: het rooster past op de schermbreedte, zodat
              verticaal scrollen (24-uursas) nooit met een horizontale as concurreert. */}
          <div>
            {/* dagkoppen */}
            <div className="grid border-b border-line" style={{ gridTemplateColumns: "2.25rem repeat(7, 1fr)" }}>
              <span />
              {days.map((d) => (
                <Link
                  key={d.key}
                  href={d.href}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[12px] ${
                    d.key === todayKey ? "text-accent" : "text-ink-soft"
                  }`}
                >
                  <span>{d.weekdayShort}</span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums ${
                      d.key === todayKey ? "bg-accent text-white" : "text-ink"
                    }`}
                  >
                    {d.dayNumber}
                  </span>
                </Link>
              ))}
            </div>
            {/* raster */}
            <div className="grid" style={{ gridTemplateColumns: "2.25rem repeat(7, 1fr)" }}>
              <HourAxis />
              {days.map((d) => (
                <div
                  key={d.key}
                  className={`relative border-r border-line/60 last:border-r-0 ${
                    d.key === todayKey ? "bg-accent-soft/30" : ""
                  }`}
                  style={{ height: GRID_PX }}
                >
                  <HourLines />
                  {(byDay.get(d.key) ?? []).map((e) => (
                    <TimeBlock
                      key={e.id}
                      entry={e}
                      locations={locations}
                      onOpen={setOpened}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "maand" && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line">
            {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => (
              <span key={d} className="py-2 text-center text-[12px] font-medium text-ink-faint">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = byDay.get(d.key) ?? [];
              const minutes = list.reduce((acc, e) => acc + entryMinutes(e), 0);
              return (
                <Link
                  key={d.key}
                  href={d.href}
                  className={`flex min-h-[72px] flex-col items-center gap-1 border-t border-r border-line/60 p-1.5 transition-colors active:bg-canvas lg:min-h-[96px] lg:hover:bg-canvas ${
                    d.inMonth ? "" : "opacity-40"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums ${
                      d.key === todayKey
                        ? "bg-accent font-semibold text-white"
                        : "text-ink"
                    }`}
                  >
                    {d.dayNumber}
                  </span>
                  {list.length > 0 && (
                    <>
                      <span className="flex flex-wrap items-center justify-center gap-0.5">
                        {list.slice(0, 4).map((e) => (
                          <span
                            key={e.id}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: locationOf(e, locations).color }}
                          />
                        ))}
                        {list.length > 4 && (
                          <span className="text-[10px] text-ink-faint">+{list.length - 4}</span>
                        )}
                      </span>
                      <span className="text-[11px] text-ink-soft tabular-nums">
                        {formatHours(minutes)}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {view === "dag" && (
        <div className="flex flex-col gap-4">
          <div className="card overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: "3rem 1fr" }}>
              <HourAxis />
              <div className="relative" style={{ height: GRID_PX }}>
                <HourLines />
                {selectedEntries.map((e) => (
                  <TimeBlock
                    key={e.id}
                    entry={e}
                    locations={locations}
                    onOpen={setOpened}
                  />
                ))}
              </div>
            </div>
          </div>
          <EntryList
            entries={selectedEntries}
            locations={locations}
            canEdit={canEdit}
          />
        </div>
      )}

      {/* detail/bewerken van een aangetikt blok */}
      <Sheet
        open={opened !== null}
        onClose={() => setOpened(null)}
        title={canEdit ? "Uren bewerken" : "Urenblok"}
      >
        {opened &&
          (canEdit ? (
            <EntryForm
              defaultDate={opened.date}
              entry={opened}
              locations={locations}
              onDone={() => setOpened(null)}
            />
          ) : (
            <EntryDetail entry={opened} locations={locations} />
          ))}
      </Sheet>
    </>
  );
}

// Totalen onder de kalender (uren altijd, € alleen met tarief).
export function CalendarTotals({ entries }: { entries: EntryDTO[] }) {
  const minutes = entries.reduce((acc, e) => acc + entryMinutes(e), 0);
  const cents = entries.reduce<number | null>(
    (acc, e) => {
      const c = entryCents(e);
      return c === null || acc === null ? null : acc + c;
    },
    entries.length > 0 ? 0 : null,
  );
  return (
    <p className="text-[15px] text-ink-soft tabular-nums">
      Totaal: <strong className="text-ink">{formatHours(minutes)}</strong>
      {cents !== null && (
        <>
          {" · "}
          <strong className="text-ink">{formatEUR(cents)}</strong>
        </>
      )}
    </p>
  );
}
