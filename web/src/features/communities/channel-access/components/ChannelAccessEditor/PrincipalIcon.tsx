import { UsersThreeIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { RoleDot } from '@/features/roles/components/RoleDot';
import { Avatar } from '@/shared/ui/Avatar';

import type { PrincipalDetails } from './usePrincipalDirectory';

const useStyles = createStyles(({ token, css }) => ({
  icon: css`
    display: inline-grid;
    flex-shrink: 0;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${token.colorFillTertiary};
    color: ${token.colorPrimary};
  `,
}));

export function PrincipalIcon({ details }: { details: PrincipalDetails }) {
  const { styles } = useStyles();

  switch (details.kind) {
    case 'everyone':
      return (
        <span className={styles.icon}>
          <UsersThreeIcon size={16} />
        </span>
      );
    case 'role':
      return (
        <span className={styles.icon}>
          <RoleDot color={details.color} />
        </span>
      );
    case 'member':
      return <Avatar path={details.avatarPath} alt={details.name} size={28} shape="circle" />;
  }
}
