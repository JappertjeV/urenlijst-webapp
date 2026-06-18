import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { listLocations } from "@/server/locations";
import { getICloudStatus } from "@/server/icloud";
import { LocationManager } from "@/components/LocationManager";
import { IcloudSettings } from "@/components/IcloudSettings";

export default async function InstellingenPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const locations = await listLocations(userId);
  const icloud = await getICloudStatus(userId);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-medium">Instellingen</h1>
          <Link href="/" className="text-sm text-accent">← Kalender</Link>
        </div>
        <h2 className="mb-3 text-lg font-medium">Werklocaties</h2>
        <LocationManager locations={locations} />
      </div>
      <IcloudSettings status={icloud} />
    </div>
  );
}
