import type { Translation } from '../translation';
import type { conversation as source } from '../uk/conversation';

export const conversation = {
  historyLoadFailed: 'Couldn’t load messages',
  selection: {
    label: 'Selected messages',
    cancel: 'Cancel selection',
    count: '{{selected}} selected',
  },
  delete: {
    titleOne: 'Delete message?',
    titleMany_one: 'Delete {{count}} message?',
    titleMany_other: 'Delete {{count}} messages?',
    content: 'The text of the messages will become unavailable to all channel members.',
    failed: 'Couldn’t delete the messages.',
  },
  markUnread: 'Mark as unread',
  copyFailed: 'Couldn’t copy the text',
  pinFailed: 'Couldn’t change the pin.',
  markUnreadFailed: 'Couldn’t mark as unread.',
} satisfies Translation<typeof source>;
