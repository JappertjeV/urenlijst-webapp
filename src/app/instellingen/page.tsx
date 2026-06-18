import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { listLocations } from "@/server/locations";
import { LocationManager } from "@/components/LocationManager";

export default async function InstellingenPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const locations = await listLocations(userId);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Werklocaties</h1>
        <Link href="/" className="text-sm text-accent">← Kalender</Link>
      </div>
      <LocationManager locations={locations} />
    </div>
  );
}
