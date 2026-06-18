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
      <div className="flex gap-3">
        <label className="flex-1 text-sm">Begin
          <input value={start} onChange={(e) => setStart(e.target.value)} type="time"
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <label className="flex-1 text-sm">Eind
          <input value={end} onChange={(e) => setEnd(e.target.value)} type="time"
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <label className="flex-1 text-sm">Pauze (min)
          <input value={brk} onChange={(e) => setBrk(e.target.value)} type="number" min={0}
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
