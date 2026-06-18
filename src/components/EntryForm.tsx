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
const fieldCls =
  "mt-1 w-full rounded-xl border border-surface-line bg-surface px-3 py-2.5 text-base";

// 24-hour time picker (hour + minute selects) — no AM/PM regardless of locale.
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
  return (
    <div className="flex-1 text-sm text-ink-soft">
      {label}
      <div className="mt-1 flex items-center gap-1.5">
        <select aria-label={`${label} uur`} value={h}
          onChange={(e) => onChange(`${e.target.value}:${m}`)}
          className="w-full rounded-xl border border-surface-line bg-surface px-2 py-2.5 text-base text-ink">
          {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span aria-hidden="true" className="text-ink-faint">:</span>
        <select aria-label={`${label} minuten`} value={m}
          onChange={(e) => onChange(`${h}:${e.target.value}`)}
          className="w-full rounded-xl border border-surface-line bg-surface px-2 py-2.5 text-base text-ink">
          {MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
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
    <form action={action} className="flex flex-col gap-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="date" value={date} />

      <label className="text-sm text-ink-soft">Werklocatie
        <select name="locationId" defaultValue={entry?.locationId ?? locations[0]?.id}
          className={`${fieldCls} text-ink`}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>

      <div className="flex gap-3">
        <TimeSelect label="Begin" value={start} onChange={setStart} />
        <TimeSelect label="Eind" value={end} onChange={setEnd} />
        <label className="w-24 text-sm text-ink-soft">Pauze
          <input value={brk} onChange={(e) => setBrk(e.target.value)} type="number" min={0} inputMode="numeric"
            className={fieldCls} /></label>
      </div>

      <label className="text-sm text-ink-soft">Opmerking
        <textarea name="note" defaultValue={entry?.note ?? ""} rows={2} className={fieldCls} /></label>

      <div className="flex items-center justify-between rounded-xl bg-surface-soft px-3 py-2.5 text-sm">
        <span className="text-ink-soft">Totaal</span>
        <span className="text-base font-semibold">{preview}</span>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex flex-col gap-2">
        <button type="submit" className="w-full rounded-xl bg-accent py-3 text-base font-medium text-white active:opacity-80">Opslaan</button>
        <button type="button" onClick={onDone}
          className="w-full rounded-xl border border-surface-line py-3 text-base active:opacity-60">Annuleren</button>
      </div>
    </form>
  );
}
