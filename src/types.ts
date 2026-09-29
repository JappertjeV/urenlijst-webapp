// Gedeelde DTO's. Tarief- en salarisvelden zijn optioneel en worden alleen
// server-side ingevuld voor de eigenaar — voor bezoekers bestaan ze niet in
// de payload (niet "verborgen", maar echt weggelaten).

// Publiek profiel (profielkiezer): bewust zonder gebruikersnaam.
export type Profile = {
  id: string;
  name: string;
};

// Eigen account — alleen voor de ingelogde gebruiker.
export type Account = Profile & { username: string };

export type LocationDTO = {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  hourlyRate?: number; // centen — alleen voor de eigenaar
};

export type RateDTO = {
  id: string;
  hourlyRate: number; // centen
  validFrom: string; // yyyy-MM-dd
};

export type EntryDTO = {
  id: string;
  date: string; // yyyy-MM-dd
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
  rateCents?: number; // alleen voor de eigenaar
};
