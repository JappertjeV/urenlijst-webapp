import { getCurrentUserId } from "@/lib/auth";
import { getProfile } from "@/server/users";
import { listLocations } from "@/server/locations";
import { AppShell } from "@/components/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  const [profile, locations] = await Promise.all([
    userId ? getProfile(userId) : Promise.resolve(null),
    userId ? listLocations(userId) : Promise.resolve([]),
  ]);
  return (
    <AppShell canEdit={!!userId} userName={profile?.name ?? null} locations={locations}>
      {children}
    </AppShell>
  );
}
