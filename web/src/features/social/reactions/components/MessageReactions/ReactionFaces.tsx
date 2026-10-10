import { createStyles } from 'antd-style';

import type { WorkspaceMember } from '@/features/workspaces/types';
import { Avatar } from '@/shared/ui/Avatar';

const useStyles = createStyles(({ css }) => ({
  faces: css`
    display: inline-flex;
    margin-right: -6px;

    & > * {
      border-radius: 50%;
    }
    & > * + * {
      margin-left: -6px;
    }
  `,
}));

export function ReactionFaces({ faces }: { faces: WorkspaceMember[] }) {
  const { styles } = useStyles();

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
