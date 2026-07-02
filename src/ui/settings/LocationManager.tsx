"use client";

import { useActionState, useState } from "react";
import {
  archiveLocationAction,
  deleteRateAction,
  saveLocationAction,
  saveRateAction,
  type ActionState,
} from "@/app/actions";
import { formatEUR } from "@/domain/money";
import { Sheet } from "@/ui/shell/Sheet";
import { Icon } from "@/ui/icons";
import type { LocationDTO, RateDTO } from "@/types";

function euros(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDayLabel(day: string): string {
  const [y, m, d] = day.split("-");
  return `${Number(d)}-${Number(m)}-${y}`;
}

// Naam / kleur / begintarief bewerken of aanmaken, plus archiveren.
function LocationForm({
  location,
  onDone,
}: {
  location?: LocationDTO;
  onDone: () => void;
}) {
  const [saveState, save, saving] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await saveLocationAction(prev, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null,
  );
  const [archiveState, archive, archiving] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await archiveLocationAction(prev, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null,
  );

  const error =
    saveState && "error" in saveState
      ? saveState.error
      : archiveState && "error" in archiveState
        ? archiveState.error
        : null;

  return (
    <div className="flex flex-col gap-4">
      <form action={save} className="flex flex-col gap-4">
        {location && <input type="hidden" name="id" value={location.id} />}
        <div>
          <label className="label" htmlFor="loc-name">Naam</label>
          <input
            id="loc-name"
            name="name"
            className="field"
            defaultValue={location?.name ?? ""}
            placeholder="Bijv. Kantoor"
            required
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="loc-rate">
              {location ? "Begintarief (€ per uur)" : "Uurtarief (€ per uur)"}
            </label>
            <input
              id="loc-rate"
              name="hourlyRateEuros"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="field"
              defaultValue={
                location?.hourlyRate !== undefined ? euros(location.hourlyRate) : ""
              }
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="loc-color">Kleur</label>
            <input
              id="loc-color"
              name="color"
              type="color"
              className="field h-[46px] w-16 cursor-pointer p-1"
              defaultValue={location?.color ?? "#7c3aed"}
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={saving || archiving}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
      </form>

      {location && (
        <form
          action={archive}
          onSubmit={(e) => {
            if (
              !confirm(
                "Deze werklocatie archiveren? Bestaande uren blijven zichtbaar; nieuwe uren zijn niet meer mogelijk.",
              )
            )
              e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={location.id} />
          <button type="submit" className="btn-danger w-full" disabled={saving || archiving}>
            {archiving ? "Archiveren…" : "Archiveren"}
          </button>
        </form>
      )}
    </div>
  );
}

// Tarieftijdlijn: begintarief + wijzigingen met ingangsdatum.
function RateTimeline({
  location,
  rates,
}: {
  location: LocationDTO;
  rates: RateDTO[];
}) {
  const [editing, setEditing] = useState<RateDTO | null>(null);
  const [saveState, save, saving] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await saveRateAction(prev, formData);
      if (result && "ok" in result) setEditing(null);
      return result;
    },
    null,
  );
  const [deleteState, remove, deleting] = useActionState<ActionState, FormData>(
    deleteRateAction,
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
      <ol className="flex flex-col gap-2">
        <li className="flex items-center gap-3 rounded-(--radius-control) bg-canvas px-3 py-2.5 text-[15px]">
          <span className="flex-1 text-ink-soft">Begintarief</span>
          <span className="font-semibold tabular-nums">
            {formatEUR(location.hourlyRate ?? 0)}
          </span>
        </li>
        {rates.map((rate) => (
          <li
            key={rate.id}
            className="flex items-center gap-2 rounded-(--radius-control) bg-canvas px-3 py-2 text-[15px]"
          >
            <button
              className="flex flex-1 items-center gap-3 py-0.5 text-left"
              onClick={() => setEditing(rate)}
              aria-label={`Tarief vanaf ${formatDayLabel(rate.validFrom)} bewerken`}
            >
              <span className="flex-1 text-ink-soft">
                vanaf {formatDayLabel(rate.validFrom)}
              </span>
              <span className="font-semibold tabular-nums">
                {formatEUR(rate.hourlyRate)}
              </span>
              <Icon name="potlood" size={16} />
            </button>
            <form
              action={remove}
              onSubmit={(e) => {
                if (!confirm("Dit tarief verwijderen?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={rate.id} />
              <button
                type="submit"
                aria-label="Tarief verwijderen"
                className="rounded-full p-1.5 text-danger transition active:bg-danger-soft"
                disabled={deleting}
              >
                <Icon name="kruis" size={16} />
              </button>
            </form>
          </li>
        ))}
      </ol>

      <form action={save} className="flex flex-col gap-3 border-t border-line pt-4" key={editing?.id ?? "new"}>
        <p className="text-[13px] font-medium text-ink-faint">
          {editing
            ? `Tarief vanaf ${formatDayLabel(editing.validFrom)} bewerken`
            : "Tariefwijziging toevoegen"}
        </p>
        {editing ? (
          <input type="hidden" name="id" value={editing.id} />
        ) : (
          <input type="hidden" name="locationId" value={location.id} />
        )}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="rate-from">Geldig vanaf</label>
            <input
              id="rate-from"
              name="validFrom"
              type="date"
              className="field"
              defaultValue={editing?.validFrom ?? ""}
              required
            />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="rate-euros">€ per uur</label>
            <input
              id="rate-euros"
              name="hourlyRateEuros"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              className="field"
              defaultValue={editing ? euros(editing.hourlyRate) : ""}
              required
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Opslaan…" : editing ? "Wijziging opslaan" : "Toevoegen"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(null)}
            >
              Annuleren
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export function LocationManager({
  locations,
  ratesByLocation,
}: {
  locations: LocationDTO[];
  ratesByLocation: Record<string, RateDTO[]>;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LocationDTO | null>(null);
  const [ratesFor, setRatesFor] = useState<LocationDTO | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {locations.length === 0 && (
        <div className="card px-4 py-8 text-center text-ink-faint">
          Nog geen werklocaties.
        </div>
      )}

      {locations.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {locations.map((location) => (
            <div key={location.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: location.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {location.name}
                </span>
                <span className="block text-sm text-ink-soft tabular-nums">
                  {(ratesByLocation[location.id] ?? []).length > 0
                    ? `${(ratesByLocation[location.id] ?? []).length + 1} tarieven`
                    : `${formatEUR(location.hourlyRate ?? 0)} per uur`}
                </span>
              </span>
              <button
                className="rounded-full px-3 py-1.5 text-[14px] font-medium text-accent transition active:bg-accent-soft lg:hover:bg-accent-soft"
                onClick={() => setRatesFor(location)}
              >
                Tarieven
              </button>
              <button
                aria-label={`${location.name} bewerken`}
                className="rounded-full p-2 text-ink-soft transition active:bg-canvas lg:hover:bg-canvas"
                onClick={() => setEditing(location)}
              >
                <Icon name="potlood" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn-secondary self-start" onClick={() => setCreating(true)}>
        <Icon name="plus" size={18} /> Nieuwe werklocatie
      </button>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Nieuwe werklocatie"
      >
        <LocationForm onDone={() => setCreating(false)} />
      </Sheet>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Werklocatie bewerken"
      >
        {editing && (
          <LocationForm location={editing} onDone={() => setEditing(null)} />
        )}
      </Sheet>

      <Sheet
        open={ratesFor !== null}
        onClose={() => setRatesFor(null)}
        title={ratesFor ? `Tarieven — ${ratesFor.name}` : "Tarieven"}
      >
        {ratesFor && (
          <RateTimeline
            location={ratesFor}
            rates={ratesByLocation[ratesFor.id] ?? []}
          />
        )}
      </Sheet>
    </div>
  );
}
