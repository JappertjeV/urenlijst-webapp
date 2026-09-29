import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/auth/session";
import { listActiveLocations, listLocationRates } from "@/data/locations";
import { getAccount } from "@/data/users";
import { AccountSettings } from "@/ui/settings/AccountSettings";
import { LocationManager } from "@/ui/settings/LocationManager";
import type { RateDTO } from "@/types";

export default async function InstellingenPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [locations, account] = await Promise.all([
    listActiveLocations(userId),
    getAccount(userId),
  ]);
  const ratesByLocation: Record<string, RateDTO[]> = {};
  await Promise.all(
    locations.map(async (l) => {
      ratesByLocation[l.id] = await listLocationRates(userId, l.id);
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Instellingen</h1>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[13px] font-medium tracking-wide text-ink-faint uppercase">
          Werklocaties
        </h2>
        <LocationManager locations={locations} ratesByLocation={ratesByLocation} />
      </section>

      {account && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-medium tracking-wide text-ink-faint uppercase">
            Account
          </h2>
          <AccountSettings name={account.name} username={account.username} />
        </section>
      )}
    </div>
  );
}
