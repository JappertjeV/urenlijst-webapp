"use client";

import { useState } from "react";
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

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-surface-soft p-4">
          <div className="text-[13px] text-ink-soft">Deze week</div>
          <div className="text-2xl font-medium">{formatHours(weekMinutes)}</div>
        </div>
        <div className="rounded-md bg-surface-soft p-4">
          <div className="text-[13px] text-ink-soft">Verdiend</div>
          <div className="text-2xl font-medium">{showSalary ? formatEUR(weekCents) : "—"}</div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Vandaag</h2>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={() => setEditing(null)} role="dialog" aria-modal="true" aria-label="Uren bewerken">
          <div className="my-4 w-full max-w-lg rounded-card border border-surface-line bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Uren bewerken</h2>
              <button onClick={() => setEditing(null)} className="text-sm text-ink-soft">Sluiten</button>
            </div>
            <EntryForm date={editing.date} entry={editing} locations={editableLocations}
              onDone={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
