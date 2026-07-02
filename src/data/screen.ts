import { getCurrentUserId } from "@/auth/session";
import { listEntries } from "./entries";
import { listAllLocations, rateChangesByLocation } from "./locations";
import { listProfiles } from "./users";
import { pickActiveProfile, stripRates, withRates } from "./viewer";
import type { EntryDTO, LocationDTO, Profile } from "@/types";

export type Screen = {
  activeId: string | null; // wiens uren we tonen
  isOwner: boolean; // ingelogd én naar eigen uren aan het kijken
  profiles: Profile[];
};

// Eén plek die bepaalt wiens gegevens getoond worden en of er salaris bij mag.
export async function resolveScreen(profileParam: string | undefined): Promise<Screen> {
  const currentUserId = await getCurrentUserId();
  const profiles = await listProfiles();
  const activeId = pickActiveProfile(currentUserId, profileParam, profiles);
  return {
    activeId,
    isOwner: activeId !== null && currentUserId === activeId,
    profiles,
  };
}

// Blokken + locaties voor een datumbereik, met de salarissanering op één
// choke point: niet-eigenaren krijgen nooit tarieven in de payload.
export async function loadRange(
  screen: Screen,
  range: { from: string; to: string },
): Promise<{ entries: EntryDTO[]; locations: LocationDTO[] }> {
  if (!screen.activeId) return { entries: [], locations: [] };
  const [entries, locations, changes] = await Promise.all([
    listEntries(screen.activeId, range),
    listAllLocations(screen.activeId),
    rateChangesByLocation(screen.activeId),
  ]);
  return screen.isOwner
    ? { entries: withRates(entries, locations, changes), locations }
    : { entries, locations: stripRates(locations) };
}
