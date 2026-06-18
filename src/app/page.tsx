import Link from "next/link";
import { format } from "date-fns";
import { getCurrentUserId } from "@/lib/auth";
import { listProfiles } from "@/server/users";
import { listLocations } from "@/server/locations";
import { listEntries } from "@/server/entries";
import { weekRange } from "@/lib/week";
import { workedMinutes } from "@/lib/time";
import { aggregate } from "@/lib/salary";
import { CalendarHome } from "@/components/CalendarHome";
import { SummaryCards } from "@/components/SummaryCards";
import { LocationLegend } from "@/components/LocationLegend";
import { ProfilePicker } from "@/components/ProfilePicker";
import { logoutAction } from "./actions";

export default async function HomePage({
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
      <div>
        <p className="mb-4">Nog geen profiel. Voer de seed uit of maak een account aan.</p>
        <Link href="/login" className="text-accent">Inloggen</Link>
      </div>
    );
  }

  const isOwner = currentUserId === activeId;
  const locations = await listLocations(activeId);
  // hourlyRate is salary data: never serialize it to the client for non-owners
  // (client components leak their props into the RSC payload).
  const clientLocations = isOwner
    ? locations
    : locations.map((l) => ({ ...l, hourlyRate: 0 }));

  const now = new Date();
  const { start, end } = weekRange(now);
  const weekEntries = await listEntries(activeId, {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  });
  const monthEntries = await listEntries(activeId, {
    from: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    to: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"),
  });
  const allEntries = Array.from(
    new Map([...weekEntries, ...monthEntries].map((e) => [e.id, e])).values(),
  );

  const locById = new Map(locations.map((l) => [l.id, l]));
  const agg = aggregate(
    weekEntries.map((e) => {
      const l = locById.get(e.locationId)!;
      return {
        locationId: e.locationId, name: l.name, color: l.color,
        hourlyRate: l.hourlyRate,
        minutes: workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
      };
    }),
  );
  const workedDays = new Set(weekEntries.map((e) => e.date)).size;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Urenlijst</h1>
        <div className="flex items-center gap-3 text-sm">
          {!isOwner && <ProfilePicker profiles={profiles} activeId={activeId} />}
          <Link href="/overzicht" className="text-accent">Overzicht</Link>
          {isOwner ? (
            <>
              <Link href="/instellingen" className="text-accent">Instellingen</Link>
              <form action={logoutAction}><button className="text-ink-soft">Uitloggen</button></form>
            </>
          ) : (
            <Link href="/login" className="text-accent">Inloggen</Link>
          )}
        </div>
      </div>

      <SummaryCards minutes={agg.total.minutes} cents={agg.total.cents}
        workedDays={workedDays} showSalary={isOwner} />
      <CalendarHome entries={allEntries} locations={clientLocations}
        canEdit={isOwner} showSalary={isOwner} />
      <LocationLegend locations={clientLocations} />
    </div>
  );
}
