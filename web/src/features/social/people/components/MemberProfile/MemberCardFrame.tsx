import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

import { MemberIdentity } from '../MemberIdentity';

const useStyles = createStyles(({ token, css }) => ({
  // Fills a fixed-height sheet; in a popover it keeps its natural height.
  card: css`
    box-sizing: border-box;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 22px;
    color: ${token.colorText};
    text-align: center;
  `,
}));

interface MemberCardFrameProps extends PropsWithChildren {
  name: string;
  avatarPath: string | null;
  detail: ReactNode;
  avatarSize?: number;
}

export function MemberCardFrame({
  name,
  avatarPath,
  detail,
  avatarSize,
  children,
}: MemberCardFrameProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.card}>
      <MemberIdentity name={name} avatarPath={avatarPath} detail={detail} avatarSize={avatarSize} />
      {children}
    </div>
  );
}
