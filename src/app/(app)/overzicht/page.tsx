import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  addPeriod,
  dayKey,
  isoWeekNumber,
  parseDayKey,
  periodRange,
  type Period,
} from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { formatHours } from "@/domain/time";
import { aggregate } from "@/domain/salary";
import { loadRange, resolveScreen } from "@/data/screen";
import { entryMinutes, locationOf } from "@/ui/entries/entry-helpers";
import { Icon } from "@/ui/icons";

const PERIODS: Period[] = ["dag", "week", "maand", "jaar"];
const PERIOD_LABELS: Record<Period, string> = {
  dag: "Dag",
  week: "Week",
  maand: "Maand",
  jaar: "Jaar",
};

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; periode?: string; datum?: string }>;
}) {
  const params = await searchParams;
  const screen = await resolveScreen(params.profile);

  const periode: Period = (PERIODS as string[]).includes(params.periode ?? "")
    ? (params.periode as Period)
    : "week";
  const todayKey = dayKey(new Date());
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(params.datum ?? "")
    ? params.datum!
    : todayKey;
  const date = parseDayKey(datum);
  const { start, end } = periodRange(periode, date);

  const { entries, locations } = await loadRange(screen, {
    from: dayKey(start),
    to: dayKey(end),
  });

  const agg = aggregate(
    entries.map((e) => {
      const location = locationOf(e, locations);
      return {
        locationId: location.id || e.locationId,
        name: location.name,
        color: location.color,
        hourlyRate: e.rateCents ?? 0,
        minutes: entryMinutes(e),
      };
    }),
  );
  const showSalary = screen.isOwner;

  const href = (p: Period, d: string) => {
    const query = new URLSearchParams({ periode: p, datum: d });
    if (params.profile) query.set("profile", params.profile);
    return `/overzicht?${query.toString()}`;
  };

  const label =
    periode === "dag"
      ? format(date, "EEEE d MMMM yyyy", { locale: nl })
      : periode === "week"
        ? `Week ${isoWeekNumber(date)} · ${format(start, "d MMM", { locale: nl })} – ${format(end, "d MMM yyyy", { locale: nl })}`
        : periode === "maand"
          ? format(date, "MMMM yyyy", { locale: nl })
          : format(date, "yyyy");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Overzicht</h1>
          <p className="text-[15px] text-ink-soft first-letter:uppercase">{label}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={href(periode, dayKey(addPeriod(periode, date, -1)))}
            aria-label="Vorige periode"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-canvas lg:hover:bg-canvas"
          >
            <Icon name="chevron-links" size={20} />
          </Link>
          <Link
            href={href(periode, todayKey)}
            className="rounded-full px-3 py-1.5 text-[14px] font-medium text-accent transition active:bg-accent-soft lg:hover:bg-accent-soft"
          >
            Vandaag
          </Link>
          <Link
            href={href(periode, dayKey(addPeriod(periode, date, 1)))}
            aria-label="Volgende periode"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-canvas lg:hover:bg-canvas"
          >
            <Icon name="chevron-rechts" size={20} />
          </Link>
        </div>
      </div>

      {/* periodekiezer */}
      <div className="flex w-fit rounded-full bg-surface p-1 shadow-(--shadow-soft)">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={href(p, datum)}
            className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${
              p === periode ? "bg-accent text-white" : "text-ink-soft"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* totaal */}
      <div className="card px-4 py-4 lg:max-w-xl">
        <p className="text-[13px] font-medium text-ink-faint">Totaal</p>
        <p className="mt-0.5 text-[26px] font-bold tabular-nums">
          {formatHours(agg.total.minutes)}
          {showSalary && (
            <span className="ml-3 text-[20px] font-semibold text-accent">
              {formatEUR(agg.total.cents)}
            </span>
          )}
        </p>
      </div>

      {/* per locatie */}
      {agg.perLocation.length > 0 ? (
        <div className="card divide-y divide-line overflow-hidden lg:max-w-xl">
          {agg.perLocation.map((l) => (
            <div key={l.locationId} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {l.name}
              </span>
              <span className="text-right tabular-nums">
                <span className="block text-[15px] font-semibold">
                  {formatHours(l.minutes)}
                </span>
                {showSalary && (
                  <span className="block text-sm text-ink-soft">
                    {formatEUR(l.cents)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card px-4 py-8 text-center text-ink-faint lg:max-w-xl">
          Geen uren in deze periode.
        </div>
      )}
    </div>
  );
}
