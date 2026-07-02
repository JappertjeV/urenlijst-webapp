import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  addPeriod,
  dayKey,
  eachDayOfWeek,
  isoWeekNumber,
  monthGridDays,
  parseDayKey,
  periodRange,
} from "@/domain/dates";
import { loadRange, resolveScreen } from "@/data/screen";
import {
  CalendarScreen,
  CalendarTotals,
  type CalendarDay,
} from "@/ui/calendar/CalendarScreen";
import { Icon } from "@/ui/icons";

const VIEWS = ["week", "maand", "dag"] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABELS: Record<View, string> = {
  week: "Week",
  maand: "Maand",
  dag: "Dag",
};

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; view?: string; datum?: string }>;
}) {
  const params = await searchParams;
  const screen = await resolveScreen(params.profile);

  const view: View = (VIEWS as readonly string[]).includes(params.view ?? "")
    ? (params.view as View)
    : "week";
  const todayKey = dayKey(new Date());
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(params.datum ?? "")
    ? params.datum!
    : todayKey;
  const date = parseDayKey(datum);

  // Navigatie: alles via links (server-rendered), zodat de URL deelbaar
  // blijft en er geen functies over de RSC-grens gaan.
  const href = (v: View, d: string) => {
    const query = new URLSearchParams({ view: v, datum: d });
    if (params.profile) query.set("profile", params.profile);
    return `/kalender?${query.toString()}`;
  };

  const toCalendarDay = (d: Date, inMonth = true): CalendarDay => ({
    key: dayKey(d),
    dayNumber: d.getDate(),
    weekdayShort: format(d, "EEEEEE", { locale: nl }),
    inMonth,
    href: href("dag", dayKey(d)),
  });

  const days: CalendarDay[] =
    view === "week"
      ? eachDayOfWeek(date).map((d) => toCalendarDay(d))
      : view === "maand"
        ? monthGridDays(date).map((d) =>
            toCalendarDay(d, d.getMonth() === date.getMonth()),
          )
        : [toCalendarDay(date)];

  const first = days[0]!.key;
  const last = days[days.length - 1]!.key;
  const { entries, locations } = await loadRange(screen, {
    from: first,
    to: last,
  });

  const navPeriod = view === "maand" ? "maand" : view === "week" ? "week" : "dag";
  const prevHref = href(view, dayKey(addPeriod(navPeriod, date, -1)));
  const nextHref = href(view, dayKey(addPeriod(navPeriod, date, 1)));

  const { start, end } = periodRange(navPeriod, date);
  const label =
    view === "week"
      ? `Week ${isoWeekNumber(date)} · ${format(start, "d MMM", { locale: nl })} – ${format(end, "d MMM yyyy", { locale: nl })}`
      : view === "maand"
        ? format(date, "MMMM yyyy", { locale: nl })
        : format(date, "EEEE d MMMM yyyy", { locale: nl });

  const visible =
    view === "maand"
      ? entries.filter((e) => e.date.slice(0, 7) === datum.slice(0, 7))
      : view === "dag"
        ? entries.filter((e) => e.date === datum)
        : entries;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Kalender</h1>
          <p className="text-[15px] text-ink-soft first-letter:uppercase">{label}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            aria-label="Vorige periode"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-canvas lg:hover:bg-canvas"
          >
            <Icon name="chevron-links" size={20} />
          </Link>
          <Link
            href={href(view, todayKey)}
            className="rounded-full px-3 py-1.5 text-[14px] font-medium text-accent transition active:bg-accent-soft lg:hover:bg-accent-soft"
          >
            Vandaag
          </Link>
          <Link
            href={nextHref}
            aria-label="Volgende periode"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition active:bg-canvas lg:hover:bg-canvas"
          >
            <Icon name="chevron-rechts" size={20} />
          </Link>
        </div>
      </div>

      {/* weergavekiezer */}
      <div className="flex w-fit rounded-full bg-surface p-1 shadow-(--shadow-soft)">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={href(v, datum)}
            className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${
              v === view ? "bg-accent text-white" : "text-ink-soft"
            }`}
          >
            {VIEW_LABELS[v]}
          </Link>
        ))}
      </div>

      <CalendarScreen
        view={view}
        days={days}
        todayKey={todayKey}
        selectedKey={datum}
        entries={entries}
        locations={locations}
        canEdit={screen.isOwner}
      />

      <CalendarTotals entries={visible} />
    </div>
  );
}
