const monthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'long' });
const weekdayFormat = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });

// 1 January 2024 was a Monday, where a Ukrainian week starts.
export const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
  weekdayFormat.format(new Date(2024, 0, 1 + index)),
);

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(month: Date, count: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + count, 1);
}

export function monthDays(month: Date): Date[] {
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from(
    { length },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
  );
}

/** The column, Monday first, that a month's first day falls in. */
export function firstWeekColumn(month: Date): number {
  return ((startOfMonth(month).getDay() + 6) % 7) + 1;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthTitle(month: Date): string {
  const name = monthFormat.format(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.getFullYear()}`;
}
