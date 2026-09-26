import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

import type { WorkspaceMemberLabel } from '../../hooks/useWorkspaceMemberLabels';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    min-width: 0;
  `,
  label: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface MemberLabelProps {
  entry: WorkspaceMemberLabel;
  size?: number;
}

// The one place a workspace_members row becomes a readable row — see
// useWorkspaceMemberLabels for why it can't show a real name yet.
export function MemberLabel({ entry, size = 28 }: MemberLabelProps) {
  const { styles } = useStyles();
  return (
    <span className={styles.row}>
      <Avatar path={null} alt={entry.label} size={size} shape="circle" />
      <span className={styles.label}>{entry.label}</span>
    </span>
  );
}
