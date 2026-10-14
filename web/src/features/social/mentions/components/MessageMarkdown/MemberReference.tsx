import { useConversationScope } from '@/features/social/conversation-scope/store';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import { tokenText } from '../../mention-tokens';
import type { MentionLabel } from '../../types';
import { MentionChipText, useMentionChipStyles } from './MentionChip';

interface MemberReferenceProps {
  memberId: string;
  person: MentionLabel | undefined;
  inline: boolean;
  mine: boolean;
}

/** A person named in a message: opens their profile, or plain where it cannot. */
export function MemberReference({ memberId, person, inline, mine }: MemberReferenceProps) {
  const { styles, cx } = useMentionChipStyles();
  const { workspaceId } = useConversationScope();
  const text = tokenText({ kind: 'member', id: memberId }, person?.displayName ?? undefined);
  const mentionClass = cx(styles.mention, mine && styles.mentionMe);

  if (inline || !person)
    return (
      <span className={mentionClass}>
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
        className={cx(mentionClass, styles.mentionTrigger, mine && styles.mentionMeTrigger)}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        <MentionChipText>{text}</MentionChipText>
      </button>
    </MemberProfileTrigger>
  );
}
