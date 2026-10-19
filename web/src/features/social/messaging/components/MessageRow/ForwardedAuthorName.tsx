import { useTranslation } from 'react-i18next';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import type { MessageAuthor } from '../../types';
import styles from './ForwardedAuthorName.module.css';

/** The original author of a forwarded message; one no longer known stays plain text. */
export function ForwardedAuthorName({ member }: { member: MessageAuthor | null }) {
  const { t } = useTranslation('messaging');
  const { workspaceId } = useConversationScope();

  if (!member) return t(($) => $.message.nameUnavailable);

  return (
    <MemberProfileTrigger member={{ ...member, workspaceId }}>
      <button type="button" className={styles.name}>
        {member.displayName ?? t(($) => $.message.nameUnavailable)}
      </button>
    </MemberProfileTrigger>
  );
}
