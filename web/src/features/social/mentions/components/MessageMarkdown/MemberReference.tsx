import { useConversationScope } from '@/features/social/conversation-scope/store';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import { tokenText } from '../../mention-tokens';
import type { MentionLabel } from '../../types';
import { MentionChipText } from './MentionChip';
import styles from './MentionChip.module.css';

interface MemberReferenceProps {
  memberId: string;
  person: MentionLabel | undefined;
  inline: boolean;
  mine: boolean;
}

/** A person named in a message: opens their profile, or plain where it cannot. */
export function MemberReference({ memberId, person, inline, mine }: MemberReferenceProps) {
  const { workspaceId } = useConversationScope();
  const text = tokenText({ kind: 'member', id: memberId }, person?.displayName ?? undefined);
  const variant = { 'data-me': mine || undefined, 'data-assistant': person?.isBot || undefined };

  if (inline || !person)
    return (
      <span className={styles.mention} {...variant}>
        <MentionChipText>{text}</MentionChipText>
      </span>
    );

  return (
    <MemberProfileTrigger
      member={{
        workspaceId,
        memberId,
        displayName: person.displayName,
        avatarPath: person.avatarPath ?? null,
      }}
    >
      <button
        type="button"
        className={styles.mention}
        {...variant}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        <MentionChipText>{text}</MentionChipText>
      </button>
    </MemberProfileTrigger>
  );
}
