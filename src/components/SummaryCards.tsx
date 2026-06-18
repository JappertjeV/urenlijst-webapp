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
    <div className="rounded-md bg-surface p-4">
      <div className="text-[13px] text-ink-soft">{label}</div>
      <div className="text-2xl font-medium">{value}</div>
    </div>
  );
}

export function SummaryCards({ minutes, cents, workedDays, showSalary }: Props) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      <Card label="Uren deze week" value={formatHours(minutes)} />
      <Card label="Verdiend deze week"
        value={showSalary ? formatEUR(cents) : "—"} />
      <Card label="Gewerkte dagen" value={String(workedDays)} />
    </div>
  );
}
