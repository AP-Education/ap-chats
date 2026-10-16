import { useConversationScope } from '@/features/social/conversation-scope/store';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import type { MessageAuthor } from '../../types';
import styles from './ForwardedAuthorName.module.css';

/** The original author of a forwarded message; one no longer known stays plain text. */
export function ForwardedAuthorName({ member }: { member: MessageAuthor | null }) {
  const { workspaceId } = useConversationScope();

  if (!member) return 'Ім’я недоступне';

  return (
    <MemberProfileTrigger member={{ ...member, workspaceId }}>
      <button type="button" className={styles.name}>
        {member.displayName ?? 'Ім’я недоступне'}
      </button>
    </MemberProfileTrigger>
  );
}
