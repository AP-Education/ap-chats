import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';
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

  return (
    <MemberPopover member={author}>
      <button type="button" className={className} aria-label={`Профіль ${name}`}>
        <Avatar path={author.avatarPath} alt={name} size={size} shape="circle" />
      </button>
    </MemberPopover>
  );
}
