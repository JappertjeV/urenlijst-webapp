import { salaryCents } from "./money";

export type AggregateInput = {
  locationId: string;
  name: string;
  color: string;
  hourlyRate: number; // cents
  minutes: number;
};

export type LocationTotal = {
  locationId: string;
  name: string;
  color: string;
  minutes: number;
  cents: number;
};

export type Aggregation = {
  total: { minutes: number; cents: number };
  perLocation: LocationTotal[];
};

export function aggregate(rows: AggregateInput[]): Aggregation {
  const byId = new Map<string, LocationTotal>();
  for (const row of rows) {
    const existing = byId.get(row.locationId) ?? {
      locationId: row.locationId,
      name: row.name,
      color: row.color,
      minutes: 0,
      cents: 0,
    };
    existing.minutes += row.minutes;
    existing.cents += salaryCents(row.minutes, row.hourlyRate);
    byId.set(row.locationId, existing);
  }
  const perLocation = [...byId.values()].sort((a, b) => b.cents - a.cents);
  const total = perLocation.reduce(
    (acc, l) => ({
      minutes: acc.minutes + l.minutes,
      cents: acc.cents + l.cents,
    }),
    { minutes: 0, cents: 0 },
  );
  return { total, perLocation };
}
