import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getISOWeek,
} from "date-fns";

const MON = { weekStartsOn: 1 as const };

export function dayRange(date: Date) {
  return { start: startOfDay(date), end: endOfDay(date) };
}
export function weekRange(date: Date) {
  return { start: startOfWeek(date, MON), end: endOfWeek(date, MON) };
}
export function monthRange(date: Date) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}
export function yearRange(date: Date) {
  return { start: startOfYear(date), end: endOfYear(date) };
}
export function isoWeekNumber(date: Date): number {
  return getISOWeek(date);
}
export function eachDayOfWeek(date: Date): Date[] {
  const { start, end } = weekRange(date);
  return eachDayOfInterval({ start, end });
}
export function monthGridDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), MON);
  const end = endOfWeek(endOfMonth(date), MON);
  return eachDayOfInterval({ start, end });
}
