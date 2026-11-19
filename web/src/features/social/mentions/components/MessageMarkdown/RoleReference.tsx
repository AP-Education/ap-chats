import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { useRoles } from '@/features/roles/hooks/useRoles';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { tokenText } from '../../mention-tokens';
import { MentionChipText } from './MentionChip';
import styles from './MentionChip.module.css';
import { RoleHoldersPopover } from './RoleHoldersPopover';

interface RoleReferenceProps {
  roleId: string;
  inline: boolean;
  mine: boolean;
}

/** A role named in a message, in its own color unless it reached the viewer; it opens who holds it. */
export function RoleReference({ roleId, inline, mine }: RoleReferenceProps) {
  const { t } = useTranslation('mentions');
  const { workspaceId } = useConversationScope();
  const { query } = useRoles(workspaceId);
  const role = query.data?.find((item) => item.id === roleId);
  const name = role?.name ?? (query.isPending ? undefined : t(($) => $.deletedRole));
  const color = mine ? undefined : role?.color;
  const chip = {
    className: styles.mention,
    'data-me': mine || undefined,
    'data-role': color ? true : undefined,
    style: color ? ({ '--role-color': color } as CSSProperties) : undefined,
  };
  const text = (
    <MentionChipText>{tokenText({ kind: 'role', id: roleId }, t, name)}</MentionChipText>
  );

  if (inline || !role) return <span {...chip}>{text}</span>;

  return (
    <RoleHoldersPopover workspaceId={workspaceId} role={role}>
      <button
        type="button"
        aria-haspopup="dialog"
        {...chip}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        {text}
      </button>
    </RoleHoldersPopover>
  );
}
