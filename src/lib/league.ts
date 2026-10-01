export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
};

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function weekdayFromDate(date: Date): Weekday | null {
  const jsWeekDay = date.getDay();
  if (jsWeekDay === 1) return "monday";
  if (jsWeekDay === 2) return "tuesday";
  if (jsWeekDay === 3) return "wednesday";
  if (jsWeekDay === 4) return "thursday";
  if (jsWeekDay === 5) return "friday";
  return null;
}

export function firstDateForWeekday(
  startDate: string,
  endDate: string,
  weekday: Weekday,
): string | null {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const candidate = weekdayFromDate(cursor);
    if (candidate === weekday) {
      return formatIsoDate(cursor);
    }
  }

  return null;
}