// Tijden zijn altijd hele minuten sinds middernacht (0–1439), 24-uursklok.

export function workedMinutes(
  startMinutes: number,
  endMinutes: number,
  breakMinutes: number,
): number {
  if (endMinutes <= startMinutes) {
    throw new Error("Eindtijd moet na begintijd liggen.");
  }
  const span = endMinutes - startMinutes;
  if (breakMinutes < 0 || breakMinutes >= span) {
    throw new Error("Pauze is langer dan de gewerkte tijd.");
  }
  return span - breakMinutes;
}

export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseHHMM(value: string): number {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  const text = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(2).replace(/0$/, "").replace(".", ",");
  return `${text}u`;
}
