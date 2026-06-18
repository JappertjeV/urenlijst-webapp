import { format } from "date-fns";
import { getCurrentUserId } from "@/lib/auth";
import { listProfiles } from "@/server/users";
import { listLocations, listAllLocations, getRateChangesByLocation } from "@/server/locations";
import { listEntries } from "@/server/entries";
import { weekRange } from "@/lib/week";
import { workedMinutes } from "@/lib/time";
import { salaryCents } from "@/lib/money";
import { rateForDate } from "@/lib/rates";
import { TodayScreen } from "@/components/TodayScreen";
import type { EntryDTO } from "@/types";

export default async function VandaagPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  const currentUserId = await getCurrentUserId();
  const profiles = await listProfiles();
  const activeId = currentUserId ?? profile ?? profiles[0]?.id;

  if (!activeId) {
    return (
      <p className="text-sm">
        Nog geen profiel. <a href="/register" className="text-accent">Account aanmaken</a>.
      </p>
    );
  }

  const isOwner = currentUserId === activeId;
  const [allLocations, activeLocations, rateChanges] = await Promise.all([
    listAllLocations(activeId),
    listLocations(activeId),
    getRateChangesByLocation(activeId),
  ]);
  const locById = new Map(allLocations.map((l) => [l.id, l]));
  const rateOf = (e: EntryDTO) =>
    rateForDate(locById.get(e.locationId)?.hourlyRate ?? 0, rateChanges.get(e.locationId) ?? [], e.date);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const { start, end } = weekRange(now);
  const weekEntries = await listEntries(activeId, {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  });

  const todayEntries = weekEntries
    .filter((e) => e.date === today)
    .map((e) => (isOwner ? { ...e, rateCents: rateOf(e) } : e));

  let weekMinutes = 0;
  let weekCents = 0;
  for (const e of weekEntries) {
    if (!locById.has(e.locationId)) continue;
    const m = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
    weekMinutes += m;
    weekCents += salaryCents(m, rateOf(e));
  }

  const strip = (ls: typeof allLocations) =>
    isOwner ? ls : ls.map((l) => ({ ...l, hourlyRate: 0 }));

  return (
    <TodayScreen
      today={today}
      entries={todayEntries}
      locations={strip(allLocations)}
      editableLocations={strip(activeLocations)}
      canEdit={isOwner}
      showSalary={isOwner}
      weekMinutes={weekMinutes}
      weekCents={weekCents}
    />
  );
}
