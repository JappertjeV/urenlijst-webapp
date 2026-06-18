"use client";

import { workedMinutes, formatHours, formatHHMM } from "@/lib/time";
import { salaryCents, formatEUR } from "@/lib/money";
import { deleteEntryAction } from "@/app/actions";
import type { EntryDTO, LocationDTO } from "@/types";

type Props = {
  date: string;
  entries: EntryDTO[];
  locations: LocationDTO[];
  canEdit: boolean;
  showSalary: boolean;
  onEdit: (entry: EntryDTO) => void;
};

export function DayDetail({ entries, locations, canEdit, showSalary, onEdit }: Props) {
  const locById = new Map(locations.map((l) => [l.id, l]));

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-surface-line bg-surface px-4 py-6 text-center text-sm text-ink-soft">
        Geen uren op deze dag.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-line bg-surface">
      {entries.map((e, i) => {
        const loc = locById.get(e.locationId);
        const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
        return (
          <div key={e.id} className={`flex items-center gap-3 pl-4 pr-2 ${i > 0 ? "border-t border-surface-line" : ""}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: loc?.color ?? "#888780" }} />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && onEdit(e)}
              className="flex min-h-[60px] flex-1 items-center gap-3 py-2.5 text-left active:opacity-60 disabled:active:opacity-100"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{loc?.name ?? "?"}</div>
                <div className="truncate text-[13px] text-ink-soft">
                  {formatHHMM(e.startMinutes)}–{formatHHMM(e.endMinutes)}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium">{formatHours(mins)}</div>
                {showSalary && e.rateCents != null && (
                  <div className="text-[13px] text-ink-soft">{formatEUR(salaryCents(mins, e.rateCents))}</div>
                )}
              </div>
            </button>
            {canEdit && (
              <form action={deleteEntryAction} className="shrink-0">
                <input type="hidden" name="id" value={e.id} />
                <button aria-label="Verwijder" className="flex h-11 w-9 items-center justify-center text-ink-faint active:opacity-60">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
