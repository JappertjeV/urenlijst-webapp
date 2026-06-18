export type LocationDTO = {
  id: string;
  name: string;
  color: string;
  hourlyRate: number; // cents
};

export type EntryDTO = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
};

export type Profile = { id: string; name: string; username: string };
