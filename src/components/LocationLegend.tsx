import type { LocationDTO } from "@/types";

export function LocationLegend({ locations }: { locations: LocationDTO[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4">
      {locations.map((l) => (
        <span key={l.id} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
          {l.name}
        </span>
      ))}
    </div>
  );
}
