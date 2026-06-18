import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { listLocations, listLocationRates } from "@/server/locations";
import type { LocationRateDTO } from "@/server/locations";
import { getProfile } from "@/server/users";
import { LocationManager } from "@/components/LocationManager";
import { AccountSettings } from "@/components/AccountSettings";

export default async function InstellingenPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const [locations, profile] = await Promise.all([
    listLocations(userId),
    getProfile(userId),
  ]);
  const ratesByLocation: Record<string, LocationRateDTO[]> = {};
  await Promise.all(
    locations.map(async (l) => {
      ratesByLocation[l.id] = await listLocationRates(userId, l.id);
    }),
  );
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-xl font-medium">Instellingen</h1>
        <h2 className="mb-3 text-lg font-medium">Werklocaties</h2>
        <LocationManager locations={locations} ratesByLocation={ratesByLocation} />
      </div>
      {profile && <AccountSettings name={profile.name} username={profile.username} />}
    </div>
  );
}
