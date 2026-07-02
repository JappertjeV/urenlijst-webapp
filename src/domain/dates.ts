import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getISOWeek,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

// Kalendersleutels altijd via format() op een lokale datum — nooit
// toISOString(), dat verschuift rond middernacht een dag in andere tijdzones.

export type Period = "dag" | "week" | "maand" | "jaar";

const MONDAY = { weekStartsOn: 1 as const };

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDayKey(key: string): Date {
  return parse(key, "yyyy-MM-dd", new Date(2000, 0, 1));
}

export function periodRange(
  period: Period,
  date: Date,
): { start: Date; end: Date } {
  switch (period) {
    case "dag":
      return { start: date, end: date };
    case "week":
      return { start: startOfWeek(date, MONDAY), end: endOfWeek(date, MONDAY) };
    case "maand":
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case "jaar":
      return { start: startOfYear(date), end: endOfYear(date) };
  }
}

export function addPeriod(period: Period, date: Date, amount: number): Date {
  switch (period) {
    case "dag":
      return addDays(date, amount);
    case "week":
      return addWeeks(date, amount);
    case "maand":
      return addMonths(date, amount);
    case "jaar":
      return addYears(date, amount);
  }
}

export function eachDayOfWeek(date: Date): Date[] {
  const { start, end } = periodRange("week", date);
  return eachDayOfInterval({ start, end });
}

export function monthGridDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), MONDAY);
  const end = endOfWeek(endOfMonth(date), MONDAY);
  return eachDayOfInterval({ start, end });
}

export function isoWeekNumber(date: Date): number {
  return getISOWeek(date);
}
