"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { DayDetail } from "./DayDetail";
import { EntryForm } from "./EntryForm";
import { formatHours } from "@/lib/time";
import { formatEUR } from "@/lib/money";
import type { EntryDTO, LocationDTO } from "@/types";

export function TodayScreen({
  today,
  entries,
  locations,
  editableLocations,
  canEdit,
  showSalary,
  weekMinutes,
  weekCents,
}: {
  today: string;
  entries: EntryDTO[];
  locations: LocationDTO[];
  editableLocations: LocationDTO[];
  canEdit: boolean;
  showSalary: boolean;
  weekMinutes: number;
  weekCents: number;
}) {
  const [editing, setEditing] = useState<EntryDTO | null>(null);
  const dayLabel = format(new Date(`${today}T00:00:00`), "EEEE d MMMM", { locale: nl });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] font-bold leading-tight">Vandaag</h1>
        <p className="text-sm text-ink-soft">{dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-surface-line bg-surface p-4">
          <div className="text-[13px] text-ink-soft">Deze week</div>
          <div className="text-2xl font-semibold">{formatHours(weekMinutes)}</div>
        </div>
        <div className="rounded-2xl border border-surface-line bg-surface p-4">
          <div className="text-[13px] text-ink-soft">Verdiend</div>
          <div className="text-2xl font-semibold">{showSalary ? formatEUR(weekCents) : "—"}</div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-ink-faint">Uren vandaag</h2>
        <DayDetail
          date={today}
          entries={entries}
          locations={locations}
          canEdit={canEdit}
          showSalary={showSalary}
          onEdit={(e) => setEditing(e)}
        />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setEditing(null)} role="dialog" aria-modal="true" aria-label="Uren bewerken">
          <div className="pb-safe max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-surface-line bg-surface p-4 shadow-lg sm:max-h-[85svh] sm:rounded-card"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Uren bewerken</h2>
              <button onClick={() => setEditing(null)} className="px-2 py-1 text-sm text-accent">Klaar</button>
            </div>
            <EntryForm date={editing.date} entry={editing} locations={editableLocations}
              onDone={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
