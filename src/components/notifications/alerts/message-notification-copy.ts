import type { Locale } from '@/database/drizzle/schema';

/** What a message alert says when the message itself gives nothing to show, in the recipient's language. */
export const messageNotificationCopy: Record<
  Locale,
  { attachment: string; directMessage: string; member: string }
> = {
  uk: { attachment: 'Нове вкладення', directMessage: 'Нове повідомлення', member: 'Учасник' },
  en: { attachment: 'New attachment', directMessage: 'New message', member: 'Member' },
};
