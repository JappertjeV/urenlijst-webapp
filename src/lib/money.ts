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
  // Intl separates the symbol with a normal or narrow non-breaking space.
  return eur.format(cents / 100).replace(/\s/g, " ");
}
