"use client";

import { useState } from "react";
import { formatEUR } from "@/domain/money";
import { formatHHMM, formatHours } from "@/domain/time";
import { EntryForm } from "@/ui/entries/EntryForm";
import { entryCents, entryMinutes, locationOf } from "@/ui/entries/entry-helpers";
import { Sheet } from "@/ui/shell/Sheet";
import type { EntryDTO, LocationDTO } from "@/types";

function EntryRow({
  entry,
  locations,
  onOpen,
}: {
  entry: EntryDTO;
  locations: LocationDTO[];
  onOpen?: (entry: EntryDTO) => void;
}) {
  const location = locationOf(entry, locations);
  const cents = entryCents(entry);
  const inner = (
    <>
      <span
        aria-hidden
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: location.color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">
          {location.name}
          {entry.note && (
            <span className="font-normal text-ink-faint"> · {entry.note}</span>
          )}
        </span>
        <span className="block text-sm text-ink-soft tabular-nums">
          {formatHHMM(entry.startMinutes)}–{formatHHMM(entry.endMinutes)}
          {entry.breakMinutes > 0 && ` · ${entry.breakMinutes} min pauze`}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-[15px] font-semibold tabular-nums">
          {formatHours(entryMinutes(entry))}
        </span>
        {cents !== null && (
          <span className="block text-sm text-ink-soft tabular-nums">
            {formatEUR(cents)}
          </span>
        )}
      </span>
    </>
  );

  if (!onOpen) {
    return <div className="flex items-center gap-3 px-4 py-3">{inner}</div>;
  }
  return (
    <button
      onClick={() => onOpen(entry)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-canvas lg:hover:bg-canvas"
    >
      {inner}
    </button>
  );
}

// Inset-grouped lijst van urenblokken; tik = bewerken (eigenaar).
export function EntryList({
  entries,
  locations,
  canEdit,
}: {
  entries: EntryDTO[];
  locations: LocationDTO[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<EntryDTO | null>(null);

  if (entries.length === 0) {
    return (
      <div className="card px-4 py-8 text-center text-ink-faint">
        Geen uren geregistreerd.
      </div>
    );
  }

  return (
    <>
      <div className="card divide-y divide-line overflow-hidden">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            locations={locations}
            onOpen={canEdit ? setEditing : undefined}
          />
        ))}
      </div>
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Uren bewerken"
      >
        {editing && (
          <EntryForm
            defaultDate={editing.date}
            entry={editing}
            locations={locations}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  );
}
