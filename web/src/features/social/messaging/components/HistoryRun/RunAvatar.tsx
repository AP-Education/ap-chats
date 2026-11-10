import { useTranslation } from 'react-i18next';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';
import type { MemberSummary } from '@/features/workspaces/types';
import { Avatar } from '@/shared/ui/Avatar';

interface RunAvatarProps {
  author: MemberSummary;
  size: number;
  className: string;
}

/** The face beside a run, opening the author's card. */
export function RunAvatar({ author, size, className }: RunAvatarProps) {
  const { t } = useTranslation('messaging');
  const name = author.displayName ?? t(($) => $.message.nameUnavailable);
  const { workspaceId } = useConversationScope();

  return (
    <MemberProfileTrigger member={{ ...author, workspaceId }}>
      <button
        type="button"
        className={className}
        data-chat-inset
        aria-label={t(($) => $.message.profile, { name })}
      >
        <Avatar path={author.avatarPath} alt={name} size={size} shape="circle" />
      </button>
    </MemberProfileTrigger>
  );
}
