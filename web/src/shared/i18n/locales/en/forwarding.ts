import type { Translation } from '../../translation';
import type { forwarding as source } from '../uk/forwarding';

export const forwarding = {
  title: 'Forward message',
  titleWithCount: 'Forward messages ({{count}})',
  failed: 'Couldn’t forward the message. Try again.',
  destination: 'To: {{name}}',
  chooseRecipient: 'Choose a recipient',
  searchPlaceholder: 'Find a channel or colleague',
  searchLabel: 'Find a recipient to forward to',
  recipients: 'Forward recipients',
  scopes: {
    all: 'All',
    direct: 'Direct',
    channels: 'Channels',
  },
  groups: {
    direct: 'Direct',
    channels: 'Channels',
    colleagues: 'Colleagues',
  },
  details: {
    nameUnavailable: 'Name unavailable',
    directChat: 'Direct chat',
    memberUnavailable: 'Member unavailable',
    channel: 'Channel',
    privateChannel: 'Private channel',
    startDirectChat: 'Start a direct chat',
  },
  loadingConversations: 'Loading conversations',
  searchingColleagues: 'Searching for colleagues',
  nobodyFound: 'No one found',
  noConversations: 'No conversations available',
  loadFailed: 'Couldn’t load everything.',
  showMore: 'Show more conversations',
} satisfies Translation<typeof source>;
