import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import type { Channel } from '@/features/communities/channels/types';
import { useConversationScope } from '@/features/social/conversation/store';
import { apiRequest } from '@/shared/api/http';

import type { MemberCandidate, MentionCandidate } from './MentionCandidateList';

export interface MentionQuery {
  trigger: '@' | '#';
  text: string;
}

const EVERYONE_ALIASES = ['everyone', 'all', 'усі', 'всі'];
const CHANNEL_LIMIT = 20;

function matchesEveryone(text: string) {
  const typed = text.toLocaleLowerCase();
  return EVERYONE_ALIASES.some((alias) => alias.startsWith(typed));
}

function matchingChannels(channels: Channel[], text: string): MentionCandidate[] {
  const typed = text.toLocaleLowerCase();
  return channels
    .filter((channel) => channel.name.toLocaleLowerCase().includes(typed))
    .slice(0, CHANNEL_LIMIT)
    .map((channel) => ({ kind: 'channel', channel }));
}

/** People and @everyone after `@`, channels the viewer can see after `#`. */
export function useMentionCandidates(query: MentionQuery | null): MentionCandidate[] {
  const { workspaceId, channelId, composer } = useConversationScope();
  const { token } = useQueryAuth();
  const memberText = query?.trigger === '@' ? query.text : null;
  const members = useQuery({
    queryKey: ['mention-candidates', workspaceId, channelId, memberText],
    queryFn: () =>
      apiRequest<MemberCandidate[]>(
        `/api/workspaces/${workspaceId}/channels/${channelId}/mention-candidates?q=${encodeURIComponent(memberText ?? '')}`,
        token as string,
      ),
    enabled: Boolean(token && memberText !== null),
    staleTime: 30_000,
    // Typing narrows the list in place instead of closing it between keystrokes.
    placeholderData: keepPreviousData,
  });
  const channels = useChannels(workspaceId);

  if (!query) return [];
  if (query.trigger === '#') return matchingChannels(channels.data ?? [], query.text);

  const offersEveryone = Boolean(composer.mentionEveryone) && matchesEveryone(query.text);
  return [
    ...(members.data ?? []).map((member) => ({ kind: 'member' as const, member })),
    ...(offersEveryone ? [{ kind: 'everyone' as const }] : []),
  ];
}
