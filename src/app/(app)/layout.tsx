import { getCurrentUserId } from "@/auth/session";
import { listActiveLocations } from "@/data/locations";
import { getProfile, listProfiles } from "@/data/users";
import { stripRates } from "@/data/viewer";
import { AppShell } from "@/ui/shell/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  const [profile, locations, profiles] = await Promise.all([
    userId ? getProfile(userId) : null,
    userId ? listActiveLocations(userId) : [],
    listProfiles(),
  ]);

  return (
    <AppShell
      canEdit={!!userId}
      userName={profile?.name ?? null}
      locations={stripRates(locations)}
      profiles={profiles}
    >
      {children}
    </AppShell>
  );
}
