import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

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
  /** A role colour for the name, as in a channel's member list. */
  color?: string | null;
}

export function MemberLabel({ entry, size = 28, color }: MemberLabelProps) {
  const { styles } = useStyles();
  return (
    <span className={styles.row}>
      <Avatar path={entry.member.profile.avatarPath} alt={entry.label} size={size} shape="circle" />
      <span className={styles.label} style={color ? { color } : undefined}>
        {entry.label}
      </span>
    </span>
  );
}
