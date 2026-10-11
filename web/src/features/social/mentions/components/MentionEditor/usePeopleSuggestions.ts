import { UsersThreeIcon } from '@phosphor-icons/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';
import { apiRequest } from '@/shared/api/http';

import type { Suggestion, SuggestionGroup, SuggestionQuery } from './suggestions';

interface MentionableMember {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

const EVERYONE_ALIASES = ['everyone', 'all', 'усі', 'всі'];

const everyone: Suggestion = {
  key: 'everyone',
  token: { kind: 'everyone' },
  label: '@everyone',
  visual: { icon: UsersThreeIcon },
  hint: 'Сповістити всіх у каналі',
};

function memberSuggestion(member: MentionableMember): Suggestion {
  return {
    key: member.memberId,
    token: { kind: 'member', id: member.memberId },
    label: member.displayName ?? 'Ім’я недоступне',
    visual: { avatarPath: member.avatarPath },
  };
}

function matchesEveryone(text: string) {
  const typed = text.toLocaleLowerCase();
  return EVERYONE_ALIASES.some((alias) => alias.startsWith(typed));
}

/** After `@`: members of the conversation, and @everyone where the conversation offers it. */
export function usePeopleSuggestions(query: SuggestionQuery | null): SuggestionGroup | null {
  const { workspaceId, channelId, composer } = useConversationScope();
  const { token } = useQueryAuth();
  const text = query?.trigger === '@' ? query.text : null;
  const members = useQuery({
    queryKey: ['mention-candidates', workspaceId, channelId, text],
    queryFn: () =>
      apiRequest<MentionableMember[]>(
        `/api/workspaces/${workspaceId}/channels/${channelId}/mention-candidates?q=${encodeURIComponent(text ?? '')}`,
        token as string,
      ),
    enabled: Boolean(token && text !== null),
    staleTime: 30_000,
    // Typing narrows the list in place instead of closing it between keystrokes.
    placeholderData: keepPreviousData,
  });

  if (text === null) return null;

  const items = (members.data ?? []).map(memberSuggestion);
  if (composer.mentionEveryone && matchesEveryone(text)) items.push(everyone);
  return { heading: 'Учасники', ariaLabel: 'Згадати людину', items };
}
