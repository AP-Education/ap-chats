import { useRoles } from '@/features/roles/hooks/useRoles';
import type { Role } from '@/features/roles/types';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import type { Suggestion, SuggestionQuery } from './suggestions';

function roleSuggestion(role: Role): Suggestion {
  return {
    key: role.id,
    token: { kind: 'role', id: role.id },
    label: role.name,
    visual: { roleColor: role.color },
    hint: 'Роль',
  };
}

/** After `@` in a channel: the workspace's roles, each reaching its people there. */
export function useRoleSuggestions(query: SuggestionQuery | null): Suggestion[] {
  const { workspaceId, composer } = useConversationScope();
  const { query: roles } = useRoles(workspaceId);

  if (query?.trigger !== '@' || !composer.groupMentions) return [];

  const typed = query.text.toLocaleLowerCase();
  return (roles.data ?? [])
    .filter((role) => role.name.toLocaleLowerCase().includes(typed))
    .map(roleSuggestion);
}
