import { Avatar } from '@ap/shell-ui';
import { createStyles } from 'antd-style';

import type { WorkspaceMemberLabel } from '../../hooks/useWorkspaceMemberLabels';

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  `,
  label: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 600;
  `,
}));

interface MemberLabelProps {
  entry: WorkspaceMemberLabel;
  size?: number;
}

export function MemberLabel({ entry, size = 28 }: MemberLabelProps) {
  const { styles } = useStyles();
  return (
    <span className={styles.row}>
      <Avatar path={entry.member.profile.avatarPath} alt={entry.label} size={size} shape="circle" />
      <span className={styles.label}>{entry.label}</span>
    </span>
  );
}
