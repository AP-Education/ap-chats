import type { CSSProperties } from 'react';

import { useRoles } from '@/features/roles/hooks/useRoles';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { tokenText } from '../../mention-tokens';
import { MentionChipText, useMentionChipStyles } from './MentionChip';

interface RoleReferenceProps {
  roleId: string;
  mine: boolean;
}

/** A role named in a message, in its own color unless it reached the viewer. */
export function RoleReference({ roleId, mine }: RoleReferenceProps) {
  const { styles, cx } = useMentionChipStyles();
  const { workspaceId } = useConversationScope();
  const { query } = useRoles(workspaceId);
  const role = query.data?.find((item) => item.id === roleId);
  const name = role?.name ?? (query.isPending ? undefined : 'видалена роль');
  const color = mine ? undefined : role?.color;

  return (
    <span
      className={cx(styles.mention, mine && styles.mentionMe, Boolean(color) && styles.mentionRole)}
      style={color ? ({ '--role-color': color } as CSSProperties) : undefined}
    >
      <MentionChipText>{tokenText({ kind: 'role', id: roleId }, name)}</MentionChipText>
    </span>
  );
}
