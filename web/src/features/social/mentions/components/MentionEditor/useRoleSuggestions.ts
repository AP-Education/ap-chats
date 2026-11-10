import { useTranslation } from 'react-i18next';

import { useRoles } from '@/features/roles/hooks/useRoles';
import type { Role } from '@/features/roles/types';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import type { Suggestion, SuggestionQuery } from './suggestions';

function roleSuggestion(role: Role, hint: string): Suggestion {
  return {
    key: role.id,
    token: { kind: 'role', id: role.id },
    label: role.name,
    visual: { roleColor: role.color },
    hint,
  };
}

/** After `@` in a channel: the workspace's roles, each reaching its people there. */
export function useRoleSuggestions(query: SuggestionQuery | null): Suggestion[] {
  const { t } = useTranslation('mentions');
  const { workspaceId, composer } = useConversationScope();
  const { query: roles } = useRoles(workspaceId);

  if (query?.trigger !== '@' || !composer.groupMentions) return [];

  const typed = query.text.toLocaleLowerCase();
  return (roles.data ?? [])
    .filter((role) => role.name.toLocaleLowerCase().includes(typed))
    .map((role) =>
      roleSuggestion(
        role,
        t(($) => $.suggestions.roleHint),
      ),
    );
}
