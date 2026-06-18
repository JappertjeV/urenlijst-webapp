import { formatHours } from "@/lib/time";
import { formatEUR } from "@/lib/money";
import type { Aggregation } from "@/lib/salary";

const LABELS: Record<string, string> = {
  day: "Vandaag", week: "Deze week", month: "Deze maand", year: "Dit jaar",
};

export function SalaryOverview({
  period, aggregation, showSalary,
}: {
  period: keyof typeof LABELS;
  aggregation: Aggregation;
  showSalary: boolean;
}) {
  return (
    <div className="rounded-card border border-surface-line bg-surface p-4">
      <h2 className="mb-3 text-lg font-medium">{LABELS[period]}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-ink-soft">
            <th className="text-left font-normal">Werklocatie</th>
            <th className="text-right font-normal">Uren</th>
            {showSalary && <th className="text-right font-normal">Salaris</th>}
          </tr>
        </thead>
        <tbody>
          {aggregation.perLocation.map((l) => (
            <tr key={l.locationId} className="border-t border-surface-line">
              <td className="py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ background: l.color }} />{l.name}
              </td>
              <td className="py-2 text-right">{formatHours(l.minutes)}</td>
              {showSalary && <td className="py-2 text-right">{formatEUR(l.cents)}</td>}
            </tr>
          ))}
          <tr className="border-t border-surface-line font-medium">
            <td className="py-2">Totaal</td>
            <td className="py-2 text-right">{formatHours(aggregation.total.minutes)}</td>
            {showSalary && <td className="py-2 text-right">{formatEUR(aggregation.total.cents)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
