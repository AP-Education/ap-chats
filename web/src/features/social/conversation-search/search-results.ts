import type { ConversationSearchResults, SearchResult } from './types';

export function searchResults(
  data: ConversationSearchResults,
  nameUnavailable: string,
): SearchResult[] {
  return [
    ...data.channels.map((channel) => ({
      key: `channel:${channel.id}`,
      kind: 'channel' as const,
      id: channel.id,
      name: channel.name,
    })),
    ...data.conversations.map(({ id, participant }) => ({
      key: `conversation:${id}`,
      kind: 'conversation' as const,
      id,
      name: participant.displayName ?? nameUnavailable,
      avatarPath: participant.avatarPath,
      active: participant.active,
    })),
    ...data.people.map((person) => ({
      key: `person:${person.memberId}`,
      kind: 'person' as const,
      id: person.memberId,
      name: person.displayName ?? nameUnavailable,
      avatarPath: person.avatarPath,
    })),
  ];
}
