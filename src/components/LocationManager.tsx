import { formatEUR } from "@/lib/money";
import {
  saveLocationAction,
  archiveLocationAction,
  addRateAction,
  deleteRateAction,
} from "@/app/actions";
import type { LocationDTO } from "@/types";
import type { LocationRateDTO } from "@/server/locations";

const inputCls = "mt-1 block rounded-md border border-surface-line p-2";

export function LocationManager({
  locations,
  ratesByLocation,
}: {
  locations: LocationDTO[];
  ratesByLocation: Record<string, LocationRateDTO[]>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {locations.map((l) => {
          const rates = ratesByLocation[l.id] ?? [];
          return (
            <li key={l.id} className="flex flex-col gap-3 rounded-card border border-surface-line p-3">
              <div className="flex items-start justify-between gap-3">
                <form action={saveLocationAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={l.id} />
                  <label className="text-sm">Naam
                    <input name="name" defaultValue={l.name} required className={inputCls} /></label>
                  <label className="text-sm">Kleur
                    <input name="color" type="color" defaultValue={l.color}
                      className="mt-1 block h-10 w-16 rounded-md border border-surface-line" /></label>
                  <label className="text-sm">Begintarief (€)
                    <input name="hourlyRateEuros" type="number" step="0.01" min="0"
                      defaultValue={(l.hourlyRate / 100).toFixed(2)} required
                      className={`${inputCls} w-28`} /></label>
                  <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">Opslaan</button>
                </form>
                <form action={archiveLocationAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <button className="text-sm text-red-600">Archiveer</button>
                </form>
              </div>

              <div className="border-t border-surface-line pt-3">
                <div className="mb-1 text-sm font-medium">Tarieven</div>
                <ul className="flex flex-col gap-1 text-sm">
                  <li className="text-ink-soft">Vanaf het begin · {formatEUR(l.hourlyRate)}/uur</li>
                  {rates.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span>Vanaf {r.validFrom} · {formatEUR(r.hourlyRate)}/uur</span>
                      <form action={deleteRateAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-xs text-red-600">verwijder</button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={addRateAction} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="locationId" value={l.id} />
                  <label className="text-sm">Vanaf
                    <input name="validFrom" type="date" required className={inputCls} /></label>
                  <label className="text-sm">Tarief (€)
                    <input name="hourlyRateEuros" type="number" step="0.01" min="0" required
                      className={`${inputCls} w-28`} /></label>
                  <button className="rounded-md border border-surface-line px-3 py-2 text-sm">Tarief toevoegen</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      <form action={saveLocationAction} className="flex flex-wrap items-end gap-3 rounded-md border border-surface-line p-3">
        <div className="w-full text-sm font-medium">Nieuwe werklocatie</div>
        <label className="text-sm">Naam
          <input name="name" required className={inputCls} /></label>
        <label className="text-sm">Kleur
          <input name="color" type="color" defaultValue="#534ab7"
            className="mt-1 block h-10 w-16 rounded-md border border-surface-line" /></label>
        <label className="text-sm">Uurloon (€)
          <input name="hourlyRateEuros" type="number" step="0.01" min="0" required
            className={`${inputCls} w-28`} /></label>
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">Toevoegen</button>
      </form>
    </div>
  );
}
