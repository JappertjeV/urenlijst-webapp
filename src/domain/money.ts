// Geld is altijd een geheel aantal centen; nooit floats opslaan of optellen.

export function salaryCents(
  workedMinutes: number,
  hourlyRateCents: number,
): number {
  return Math.round((workedMinutes / 60) * hourlyRateCents);
}

const eur = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(cents: number): string {
  // Intl gebruikt (narrow) non-breaking spaces tussen symbool en bedrag.
  return eur.format(cents / 100).replace(/\s/g, " ");
}
