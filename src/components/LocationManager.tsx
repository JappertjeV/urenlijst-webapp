import { formatEUR } from "@/lib/money";
import { saveLocationAction, archiveLocationAction } from "@/app/actions";
import type { LocationDTO } from "@/types";

export function LocationManager({ locations }: { locations: LocationDTO[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center gap-3 rounded-md border border-surface-line p-3">
            <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
            <span className="flex-1">{l.name}</span>
            <span className="text-sm text-ink-soft">{formatEUR(l.hourlyRate)}/uur</span>
            <form action={archiveLocationAction}>
              <input type="hidden" name="id" value={l.id} />
              <button className="text-sm text-red-600">Archiveer</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveLocationAction} className="flex flex-wrap items-end gap-3 rounded-md border border-surface-line p-3">
        <label className="text-sm">Naam
          <input name="name" required className="mt-1 block rounded-md border border-surface-line p-2" /></label>
        <label className="text-sm">Kleur
          <input name="color" type="color" defaultValue="#534ab7"
            className="mt-1 block h-10 w-16 rounded-md border border-surface-line" /></label>
        <label className="text-sm">Uurloon (€)
          <input name="hourlyRateEuros" type="number" step="0.01" min="0" required
            className="mt-1 block w-28 rounded-md border border-surface-line p-2" /></label>
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">Toevoegen</button>
      </form>
    </div>
  );
}
