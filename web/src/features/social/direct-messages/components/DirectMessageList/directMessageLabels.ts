import { previewText } from '../../../mentions/mention-tokens';
import { callTitle } from '../../../messaging/components/CallLogRow/callTitle';
import { isLoneGif } from '../../../messaging/gifs/gif-links';
import type { DirectMessage } from '../../api/direct-messages-api';

const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'numeric' });

const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 1_440;
const WEEK_MINUTES = 10_080;

export function lastMessagePreview(message: DirectMessage['lastMessage']): string {
  if (!message) return 'Нова розмова';
  if (message.markdown === null) return 'Повідомлення видалено';
  if (!message.markdown)
    return message.attachments?.some((file) => file.voice) ? 'Голосове повідомлення' : 'Вкладення';
  return isLoneGif(message) ? 'GIF' : previewText(message.markdown);
}

/** What happened last: a call once it came after every message, otherwise the message. */
export function conversationPreview({
  lastMessage,
  lastCall,
  participant,
}: Pick<DirectMessage, 'lastMessage' | 'lastCall' | 'participant'>): string {
  if (lastCall)
    return callTitle(lastCall.status, lastCall.startedByMemberId !== participant.memberId);
  return lastMessagePreview(lastMessage);
}

/** When the last thing happened, a message or a call. */
export function lastActivityAt({
  lastMessage,
  lastCall,
}: Pick<DirectMessage, 'lastMessage' | 'lastCall'>): string | undefined {
  return lastMessage?.createdAt ?? lastCall?.startedAt;
}

/** Minutes, hours or days ago within a week, a short date beyond that. */
export function formatRecentTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / MINUTE_MS));

  if (minutes < 1) return 'щойно';
  if (minutes < HOUR_MINUTES) return `${minutes} хв`;
  if (minutes < DAY_MINUTES) return `${Math.floor(minutes / HOUR_MINUTES)} год`;
  if (minutes < WEEK_MINUTES) return `${Math.floor(minutes / DAY_MINUTES)} дн`;
  return dateFormat.format(date);
}
