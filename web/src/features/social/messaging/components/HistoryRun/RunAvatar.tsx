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
  const name = author.displayName ?? 'Ім’я недоступне';
  const { workspaceId } = useConversationScope();

  return (
    <MemberProfileTrigger member={{ ...author, workspaceId }}>
      <button type="button" className={className} aria-label={`Профіль ${name}`}>
        <Avatar path={author.avatarPath} alt={name} size={size} shape="circle" />
      </button>
    </MemberProfileTrigger>
  );
}
