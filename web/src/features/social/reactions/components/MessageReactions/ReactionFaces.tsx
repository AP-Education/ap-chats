import type { WorkspaceMember } from '@/features/workspaces/types';
import { Avatar } from '@/shared/ui/Avatar';

import styles from './ReactionFaces.module.css';

export function ReactionFaces({ faces }: { faces: WorkspaceMember[] }) {
  return (
    <span className={styles.faces} aria-hidden="true">
      {faces.map((member) => (
        <Avatar
          key={member.id}
          path={member.profile.avatarPath}
          alt={member.profile.displayName ?? ''}
          size={22}
          shape="circle"
        />
      ))}
    </span>
  );
}
