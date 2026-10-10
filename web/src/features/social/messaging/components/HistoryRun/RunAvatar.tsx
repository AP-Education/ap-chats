import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';
import { Avatar } from '@/shared/ui/Avatar';

import type { MessageAuthor } from '../../types';

interface RunAvatarProps {
  author: MessageAuthor;
  size: number;
  className: string;
}

/** The face beside a run, opening the author's card. */
export function RunAvatar({ author, size, className }: RunAvatarProps) {
  const name = author.displayName ?? 'Ім’я недоступне';

  return (
    <MemberProfileTrigger member={author}>
      <button type="button" className={className} aria-label={`Профіль ${name}`}>
        <Avatar path={author.avatarPath} alt={name} size={size} shape="circle" />
      </button>
    </MemberProfileTrigger>
  );
}
