"use client";

import { useActionState, useMemo, useState } from "react";
import {
  deleteEntryAction,
  saveEntryAction,
  type ActionState,
} from "@/app/actions";
import type { EntryDTO, LocationDTO } from "@/types";

// 24-uurs uur+minuut-selects: geen vrije tekst, geen AM/PM, geen
// parseverrassingen. Minuten in stappen van 5, plus de exacte waarde van een
// bestaand blok als die daarbuiten valt.
function TimeSelect({
  label,
  minutes,
  onChange,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const minuteOptions = useMemo(() => {
    const options = Array.from({ length: 12 }, (_, i) => i * 5);
    if (!options.includes(minute)) options.push(minute);
    return options.sort((a, b) => a - b);
  }, [minute]);

  return (
    <div className="flex-1">
      <span className="label">{label}</span>
      <div className="flex items-center gap-1">
        <select
          aria-label={`${label} — uur`}
          className="field text-center tabular-nums"
          value={hour}
          onChange={(e) => onChange(Number(e.target.value) * 60 + minute)}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span className="text-ink-faint">:</span>
        <select
          aria-label={`${label} — minuten`}
          className="field text-center tabular-nums"
          value={minute}
          onChange={(e) => onChange(hour * 60 + Number(e.target.value))}
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function EntryForm({
  defaultDate,
  entry,
  locations,
  onDone,
}: {
  defaultDate: string; // yyyy-MM-dd — de dag die de gebruiker bekijkt
  entry?: EntryDTO; // aanwezig bij bewerken
  locations: LocationDTO[];
  onDone: () => void;
}) {
  const [start, setStart] = useState(entry?.startMinutes ?? 9 * 60);
  const [end, setEnd] = useState(entry?.endMinutes ?? 17 * 60);

  // Actieve locaties zijn kiesbaar; de (eventueel gearchiveerde) locatie van
  // het blok zelf blijft zichtbaar zodat bewerken nooit stukloopt.
  const options = locations.filter(
    (l) => !l.archived || l.id === entry?.locationId,
  );
  const [saveState, save, saving] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await saveEntryAction(prev, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null,
  );
  const [deleteState, remove, deleting] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await deleteEntryAction(prev, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null,
  );

  const error =
    saveState && "error" in saveState
      ? saveState.error
      : deleteState && "error" in deleteState
        ? deleteState.error
        : null;

  return (
    <div className="flex flex-col gap-4">
      <form action={save} className="flex flex-col gap-4">
        {entry && <input type="hidden" name="id" value={entry.id} />}
        <input type="hidden" name="startMinutes" value={start} />
        <input type="hidden" name="endMinutes" value={end} />

        <div>
          <label className="label" htmlFor="entry-date">
            Datum
          </label>
          <input
            id="entry-date"
            type="date"
            name="date"
            className="field"
            defaultValue={entry?.date ?? defaultDate}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="entry-location">
            Werklocatie
          </label>
          <select
            id="entry-location"
            name="locationId"
            className="field"
            defaultValue={entry?.locationId}
            required
          >
            {options.length === 0 && (
              <option value="">Maak eerst een werklocatie aan</option>
            )}
            {options.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.archived ? " (gearchiveerd)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <TimeSelect label="Begintijd" minutes={start} onChange={setStart} />
          <TimeSelect label="Eindtijd" minutes={end} onChange={setEnd} />
        </div>

        <div>
          <label className="label" htmlFor="entry-break">
            Pauze (minuten)
          </label>
          <input
            id="entry-break"
            type="number"
            name="breakMinutes"
            className="field"
            inputMode="numeric"
            min={0}
            step={5}
            defaultValue={entry?.breakMinutes ?? 0}
          />
        </div>

        <div>
          <label className="label" htmlFor="entry-note">
            Notitie (optioneel)
          </label>
          <input
            id="entry-note"
            type="text"
            name="note"
            className="field"
            defaultValue={entry?.note ?? ""}
            placeholder="Bijv. avonddienst"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={saving || deleting}>
          {saving ? "Opslaan…" : entry ? "Wijzigingen opslaan" : "Uren opslaan"}
        </button>
      </form>

      {entry && (
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Dit urenblok verwijderen?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            className="btn-danger w-full"
            disabled={saving || deleting}
          >
            {deleting ? "Verwijderen…" : "Verwijderen"}
          </button>
        </form>
      )}
    </div>
  );
}
