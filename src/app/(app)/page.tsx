import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { dayKey, periodRange } from "@/domain/dates";
import { loadRange, resolveScreen } from "@/data/screen";
import { entryCents, entryMinutes } from "@/ui/entries/entry-helpers";
import { EntryList } from "@/ui/entries/EntryList";
import { StatCards } from "@/ui/StatCards";

export default async function VandaagPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  const screen = await resolveScreen(profile);

  if (!screen.activeId) {
    return (
      <div className="card px-4 py-8 text-center">
        <p className="mb-2 font-medium">Nog geen profielen.</p>
        <Link href="/register" className="text-accent">
          Maak het eerste account aan →
        </Link>
      </div>
    );
  }

  const now = new Date();
  const today = dayKey(now);
  const week = periodRange("week", now);
  const { entries, locations } = await loadRange(screen, {
    from: dayKey(week.start),
    to: dayKey(week.end),
  });

  const todayEntries = entries.filter((e) => e.date === today);
  const sum = (list: typeof entries) =>
    list.reduce(
      (acc, e) => {
        acc.minutes += entryMinutes(e);
        acc.cents = screen.isOwner ? (acc.cents ?? 0) + (entryCents(e) ?? 0) : null;
        return acc;
      },
      { minutes: 0, cents: screen.isOwner ? 0 : null } as {
        minutes: number;
        cents: number | null;
      },
    );

  const day = sum(todayEntries);
  const weekTotal = sum(entries);
  const workedDays = new Set(entries.map((e) => e.date)).size;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Vandaag</h1>
        <p className="text-[15px] text-ink-soft first-letter:uppercase">
          {format(now, "EEEE d MMMM yyyy", { locale: nl })}
        </p>
      </div>

      <StatCards
        stats={[
          { label: "Vandaag", minutes: day.minutes, cents: day.cents },
          {
            label: "Deze week",
            minutes: weekTotal.minutes,
            cents: weekTotal.cents,
            hint: `${workedDays} ${workedDays === 1 ? "dag" : "dagen"} gewerkt`,
          },
        ]}
      />

      <EntryList
        entries={todayEntries}
        locations={locations}
        canEdit={screen.isOwner}
      />
    </div>
  );
}
