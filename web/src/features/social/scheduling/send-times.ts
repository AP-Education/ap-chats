const DAY_MS = 24 * 60 * 60 * 1000;
const LATEST_SEND_DAYS = 365;

const clockFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
const datedYearFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export interface SendTimeOption {
  label: string;
  sendAt: Date;
}

/** Quick picks, each still ahead and none the same moment twice. */
export function sendTimeOptions(now: Date): SendTimeOption[] {
  const inAnHour = new Date(now.getTime() + 60 * 60 * 1000);
  inAnHour.setSeconds(0, 0);
  const evening = atHour(now, 0, 18);
  const daysToMonday = (8 - now.getDay()) % 7 || 7;

  return [
    { label: 'Через годину', sendAt: inAnHour },
    ...(evening > inAnHour ? [{ label: 'Сьогодні о 18:00', sendAt: evening }] : []),
    { label: 'Завтра о 09:00', sendAt: atHour(now, 1, 9) },
    ...(daysToMonday > 1
      ? [{ label: 'У понеділок о 09:00', sendAt: atHour(now, daysToMonday, 9) }]
      : []),
  ];
}

/** A send time as it reads inside a sentence: "завтра о 09:00", "20 жовтня о 09:00". */
export function sendTimeLabel(sendAt: Date, now: Date): string {
  const clock = clockFormat.format(sendAt);
  const days = Math.round((startOfDay(sendAt) - startOfDay(now)) / DAY_MS);

  if (days === 0) return `сьогодні о ${clock}`;
  if (days === 1) return `завтра о ${clock}`;
  const format = sendAt.getFullYear() === now.getFullYear() ? dateFormat : datedYearFormat;
  return `${format.format(sendAt)} о ${clock}`;
}

export function sendTimeHeading(sendAt: Date, now: Date): string {
  const label = sendTimeLabel(sendAt, now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** The window the server accepts: ahead of now, within a year. */
export function isSendTimeAllowed(sendAt: Date, now: Date): boolean {
  const ahead = sendAt.getTime() - now.getTime();
  return ahead > 0 && ahead <= LATEST_SEND_DAYS * DAY_MS;
}

/** What a datetime-local input shows for a moment, in the viewer's own time zone. */
export function localInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A date-time without an offset is read as local time, the zone the input showed it in.
export function fromLocalInputValue(value: string): Date | null {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date : null;
}

export function latestSendTime(now: Date): Date {
  return new Date(now.getTime() + LATEST_SEND_DAYS * DAY_MS);
}

function atHour(day: Date, offsetDays: number, hour: number): Date {
  const date = new Date(day);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
