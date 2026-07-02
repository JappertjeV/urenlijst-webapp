export type RateChange = {
  hourlyRate: number; // centen
  validFrom: string; // yyyy-MM-dd
};

// Het tarief (centen) dat geldt op `date` (yyyy-MM-dd): van de wijzigingen
// met validFrom <= date de laatste; zonder toepasselijke wijziging het
// begintarief. yyyy-MM-dd-strings sorteren lexicografisch = chronologisch.
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
