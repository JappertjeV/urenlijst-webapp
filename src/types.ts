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
  rateCents?: number; // applicable hourly rate (cents) for this entry's date; owner-only
};

export type Profile = { id: string; name: string; username: string };
