"use client";

import { useState } from "react";
import { parseHHMM, formatHHMM, workedMinutes, formatHours } from "@/lib/time";
import { saveEntryAction } from "@/app/actions";
import type { EntryDTO, LocationDTO } from "@/types";

type Props = {
  date: string;
  locations: LocationDTO[];
  entry?: EntryDTO;
  onDone: () => void;
};

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, m) => String(m).padStart(2, "0"));

// 24-hour time picker (hour + minute selects). Avoids the native
// <input type="time"> which shows AM/PM on 12-hour device locales.
function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [h, m] = value.split(":");
  const selectClass = "w-full rounded-md border border-surface-line p-2";
  return (
    <div className="flex-1 text-sm">
      {label}
      <div className="mt-1 flex items-center gap-1">
        <select
          aria-label={`${label} uur`}
          value={h}
          onChange={(e) => onChange(`${e.target.value}:${m}`)}
          className={selectClass}
        >
          {HOURS.map((hh) => (
            <option key={hh} value={hh}>{hh}</option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select
          aria-label={`${label} minuten`}
          value={m}
          onChange={(e) => onChange(`${h}:${e.target.value}`)}
          className={selectClass}
        >
          {MINUTES.map((mm) => (
            <option key={mm} value={mm}>{mm}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function EntryForm({ date, locations, entry, onDone }: Props) {
  const [start, setStart] = useState(formatHHMM(entry?.startMinutes ?? 540));
  const [end, setEnd] = useState(formatHHMM(entry?.endMinutes ?? 1020));
  const [brk, setBrk] = useState(String(entry?.breakMinutes ?? 30));
  const [error, setError] = useState<string | null>(null);

  let preview = "";
  try {
    preview = formatHours(workedMinutes(parseHHMM(start), parseHHMM(end), Number(brk)));
  } catch {
    preview = "—";
  }

  async function action(formData: FormData) {
    formData.set("startMinutes", String(parseHHMM(start)));
    formData.set("endMinutes", String(parseHHMM(end)));
    formData.set("breakMinutes", brk);
    try {
      await saveEntryAction(formData);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt.");
    }
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="date" value={date} />
      <label className="text-sm">Werklocatie
        <select name="locationId" defaultValue={entry?.locationId ?? locations[0]?.id}
          className="mt-1 w-full rounded-md border border-surface-line p-2">
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <TimeSelect label="Begin" value={start} onChange={setStart} />
        <TimeSelect label="Eind" value={end} onChange={setEnd} />
        <label className="flex-1 text-sm">Pauze (min)
          <input value={brk} onChange={(e) => setBrk(e.target.value)} type="number" min={0} inputMode="numeric"
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
      </div>
      <label className="text-sm">Opmerking
        <textarea name="note" defaultValue={entry?.note ?? ""} rows={2}
          className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
      <div className="text-sm text-ink-soft">Totaal: <b>{preview}</b></div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm text-white">Opslaan</button>
        <button type="button" onClick={onDone}
          className="rounded-md border border-surface-line px-4 py-2 text-sm">Annuleren</button>
      </div>
    </form>
  );
}
