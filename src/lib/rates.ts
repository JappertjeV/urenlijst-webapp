export type RateChange = {
  hourlyRate: number; // cents
  validFrom: string; // yyyy-MM-dd
};

// Resolve the hourly rate (cents) that applies on `date` (yyyy-MM-dd):
// among the rate changes with validFrom <= date, take the latest one;
// if none apply, fall back to the location's base rate.
// validFrom and date are yyyy-MM-dd strings, so lexicographic comparison
// matches chronological order.
export function rateForDate(
  baseRate: number,
  rates: RateChange[],
  date: string,
): number {
  let result = baseRate;
  let best: string | null = null;
  for (const r of rates) {
    if (r.validFrom <= date && (best === null || r.validFrom > best)) {
      best = r.validFrom;
      result = r.hourlyRate;
    }
  }
  return result;
}
