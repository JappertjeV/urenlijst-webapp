// Entry-datums staan in de database als DateTime op exact UTC-middernacht
// (identiek aan de bestaande productiedata). Deze twee helpers zijn de enige
// plek waar die conversie plaatsvindt. toISOString() is hier veilig omdat de
// waarde al UTC-middernacht is — dit is databaseserialisatie, geen lokale
// datumafleiding.

export function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
