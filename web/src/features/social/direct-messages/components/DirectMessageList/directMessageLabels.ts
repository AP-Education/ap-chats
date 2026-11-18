import type { TFunction } from 'i18next';

import { dateTimeFormat } from '../../../../../shared/i18n/format';
import { previewText } from '../../../mentions/mention-tokens';
import { callTitle } from '../../../messaging/components/CallLogRow/callTitle';
import { isLoneGif } from '../../../messaging/gifs/gif-links';
import type { DirectMessage } from '../../api/direct-messages-api';

const dateFormat = dateTimeFormat({ day: 'numeric', month: 'numeric' });

const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 1_440;
const WEEK_MINUTES = 10_080;

export function lastMessagePreview(
  message: DirectMessage['lastMessage'],
  t: TFunction<'directMessages'>,
): string {
  if (!message) return t(($) => $.row.newConversation);
  if (message.markdown === null) return t(($) => $.row.messageDeleted);
  if (!message.markdown)
    return message.attachments?.some((file) => file.voice)
      ? t(($) => $.row.voiceMessage)
      : t(($) => $.row.attachment);
  return isLoneGif(message) ? 'GIF' : previewText(message.markdown);
}

/** What happened last: a call once it came after every message, otherwise the message. */
export function conversationPreview(
  {
    lastMessage,
    lastCall,
    participant,
  }: Pick<DirectMessage, 'lastMessage' | 'lastCall' | 'participant'>,
  t: TFunction<'directMessages'>,
): string {
  if (lastCall)
    return callTitle(lastCall.status, lastCall.startedByMemberId !== participant.memberId);
  return lastMessagePreview(lastMessage, t);
}

/** When the last thing happened: a call only stays on the conversation while it is the newest. */
export function lastActivityAt({
  lastMessage,
  lastCall,
}: Pick<DirectMessage, 'lastMessage' | 'lastCall'>): string | undefined {
  return lastCall?.startedAt ?? lastMessage?.createdAt;
}

/** Minutes, hours or days ago within a week, a short date beyond that. */
export function formatRecentTime(
  value: string,
  t: TFunction<'directMessages'>,
  locale: string,
  now = new Date(),
): string {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / MINUTE_MS));

  if (minutes < 1) return t(($) => $.row.justNow);
  if (minutes < HOUR_MINUTES) return t(($) => $.row.minutesAgo, { minutes });
  if (minutes < DAY_MINUTES)
    return t(($) => $.row.hoursAgo, { hours: Math.floor(minutes / HOUR_MINUTES) });
  if (minutes < WEEK_MINUTES)
    return t(($) => $.row.daysAgo, { days: Math.floor(minutes / DAY_MINUTES) });
  return dateFormat(locale).format(date);
}
