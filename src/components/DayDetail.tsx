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

export function DayDetail({ date, entries, locations, canEdit, showSalary, onEdit }: Props) {
  const locById = new Map(locations.map((l) => [l.id, l]));
  if (entries.length === 0)
    return <p className="text-sm text-ink-soft">Geen uren op {date}.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => {
        const loc = locById.get(e.locationId);
        const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-md border border-surface-line p-3">
            <span className="rounded-md px-2 py-1 text-xs font-medium"
              style={{ background: `${loc?.color ?? "#888"}22`, color: loc?.color ?? "#333" }}>
              {loc?.name ?? "?"}
            </span>
            <span className="text-sm text-ink-soft">
              {formatHHMM(e.startMinutes)}–{formatHHMM(e.endMinutes)}
            </span>
            <span className="flex-1 truncate text-sm text-ink-soft">{e.note ?? ""}</span>
            <span className="text-sm font-medium">{formatHours(mins)}</span>
            {showSalary && e.rateCents != null && (
              <span className="w-20 text-right text-sm font-medium">
                {formatEUR(salaryCents(mins, e.rateCents))}
              </span>
            )}
            {canEdit && (
              <>
                <button onClick={() => onEdit(e)} className="text-sm text-accent">Wijzig</button>
                <form action={deleteEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-sm text-red-600">Verwijder</button>
                </form>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
