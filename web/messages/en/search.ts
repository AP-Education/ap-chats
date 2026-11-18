import type { Translation } from '../translation';
import type { search as source } from '../uk/search';

export const search = {
  trigger: {
    label: 'Search people and chats',
    open: 'Open people and chat search',
  },
  dialog: {
    title: 'Search',
    description: 'People and chats · {{workspace}}',
    inputLabel: 'Search people and chats',
    placeholder: 'Name or channel name',
    hint: 'Enter a colleague’s name, a channel or a conversation.',
    searching: 'Searching…',
    failed: 'Couldn’t complete the search.',
    retry: 'Retry',
    empty: 'Nothing found. Try a different name or channel title.',
    opening: 'Opening conversation…',
    openFailed: 'Couldn’t open the conversation. Please try again.',
  },
  results: {
    label: 'Search results',
    limit: 'Showing the first 20 results. Refine your search.',
    nameUnavailable: 'Name unavailable',
  },
  groups: {
    channel: 'Channels',
    conversation: 'Conversations',
    person: 'People',
  },
  descriptions: {
    channel: 'Channel',
    person: 'Message colleague',
    leftCompany: 'Member left the company',
    conversation: 'Direct message',
  },
} satisfies Translation<typeof source>;
