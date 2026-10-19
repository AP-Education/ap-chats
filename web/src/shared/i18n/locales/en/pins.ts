import type { Translation } from '../../translation';
import type { pins as source } from '../uk/pins';

export const pins = {
  loading: 'Loading pinned messages',
  loadFailed: 'Couldn’t load pinned messages.',
  empty: 'No pinned messages yet',
  nameUnavailable: 'Name unavailable',
  unpinFailed: 'Couldn’t unpin the message.',
  pinnedMessage: 'Pinned message',
  pinnedMessages: 'Pinned messages',
  showAll: 'All pinned messages',
  unpin: 'Unpin message',
  actions: {
    pin: 'Pin',
    unpin: 'Unpin',
  },
} satisfies Translation<typeof source>;
