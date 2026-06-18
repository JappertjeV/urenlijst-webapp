import Link from "next/link";
import { format } from "date-fns";
import { getCurrentUserId } from "@/lib/auth";
import { listProfiles } from "@/server/users";
import { listAllLocations, getRateChangesByLocation } from "@/server/locations";
import { listEntries } from "@/server/entries";
import { dayRange, weekRange, monthRange, yearRange } from "@/lib/week";
import { workedMinutes } from "@/lib/time";
import { aggregate } from "@/lib/salary";
import { rateForDate } from "@/lib/rates";
import { SalaryOverview } from "@/components/SalaryOverview";

const RANGES = { day: dayRange, week: weekRange, month: monthRange, year: yearRange };
type Period = keyof typeof RANGES;

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  const currentUserId = await getCurrentUserId();
  const profiles = await listProfiles();
  const activeId = currentUserId ?? profile ?? profiles[0]?.id;
  if (!activeId) return <p>Geen profiel.</p>;

  const isOwner = currentUserId === activeId;
  const locations = await listAllLocations(activeId);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const rateChanges = await getRateChangesByLocation(activeId);
  const now = new Date();

  const sections = await Promise.all(
    (Object.keys(RANGES) as Period[]).map(async (period) => {
      const { start, end } = RANGES[period](now);
      const entries = await listEntries(activeId, {
        from: format(start, "yyyy-MM-dd"),
        to: format(end, "yyyy-MM-dd"),
      });
      const agg = aggregate(
        entries
          .filter((e) => locById.has(e.locationId))
          .map((e) => {
            const l = locById.get(e.locationId)!;
            return {
              locationId: e.locationId, name: l.name, color: l.color,
              hourlyRate: rateForDate(l.hourlyRate, rateChanges.get(e.locationId) ?? [], e.date),
              minutes: workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
            };
          }),
      );
      return { period, agg };
    }),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Overzicht</h1>
        <Link href="/" className="text-sm text-accent">← Kalender</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ period, agg }) => (
          <SalaryOverview key={period} period={period} aggregation={agg} showSalary={isOwner} />
        ))}
      </div>
    </div>
  );
}
