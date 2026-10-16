const DAY_MS = 24 * 60 * 60 * 1000;
const LATEST_SEND_DAYS = 365;
const DEFAULT_LEAD_MS = 5 * 60 * 1000;

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

/** Where the picker starts: a few minutes ahead, on the minute. */
export function defaultSendTime(now: Date): Date {
  const sendAt = new Date(now.getTime() + DEFAULT_LEAD_MS);
  sendAt.setSeconds(0, 0);
  return sendAt;
}

/** The days a message can still go out on: today through the last day of the year ahead. */
export function isSendDayOpen(day: Date, now: Date): boolean {
  const start = startOfDay(day);
  return start >= startOfDay(now) && start <= startOfDay(latestSendTime(now));
}

/** A moment's local time as a time input shows it: "09:05". */
export function timeOfDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Read as local time, the zone the time input showed it in; an emptied input is no time at all.
export function atTimeOfDay(day: Date, time: string): Date | null {
  const [hours, minutes] = time.split(':').map(Number);
  if (!time || hours === undefined || minutes === undefined) return null;

  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
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
