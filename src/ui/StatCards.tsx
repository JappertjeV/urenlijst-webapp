import { formatEUR } from "@/domain/money";
import { formatHours } from "@/domain/time";

export function StatCards({
  stats,
}: {
  stats: { label: string; minutes: number; cents: number | null; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
      {stats.map((s) => (
        <div key={s.label} className="card px-4 py-3.5">
          <p className="text-[13px] font-medium text-ink-faint">{s.label}</p>
          <p className="mt-0.5 text-[22px] font-bold tabular-nums">
            {formatHours(s.minutes)}
          </p>
          <p className="text-sm text-ink-soft tabular-nums">
            {s.cents !== null ? formatEUR(s.cents) : (s.hint ?? " ")}
          </p>
        </div>
      ))}
    </div>
  );
}
