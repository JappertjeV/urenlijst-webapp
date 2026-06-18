import { formatHours } from "@/lib/time";
import { formatEUR } from "@/lib/money";

type Props = {
  minutes: number;
  cents: number;
  workedDays: number;
  showSalary: boolean;
};

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface-line bg-surface p-3">
      <div className="text-[12px] text-ink-soft">{label}</div>
      <div className="truncate text-xl font-semibold">{value}</div>
    </div>
  );
}

export function SummaryCards({ minutes, cents, workedDays, showSalary }: Props) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2.5">
      <Card label="Uren" value={formatHours(minutes)} />
      <Card label="Verdiend" value={showSalary ? formatEUR(cents) : "—"} />
      <Card label="Dagen" value={String(workedDays)} />
    </div>
  );
}
