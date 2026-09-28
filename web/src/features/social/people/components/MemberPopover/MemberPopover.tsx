import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactElement } from 'react';

import { MemberCard, type MemberSummary } from './MemberCard';

const useStyles = createStyles(({ token, css }) => ({
  surface: css`
    overflow: hidden;
    padding: 0;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowSecondary};
  `,
}));

interface MemberPopoverProps {
  member: MemberSummary;
  children: ReactElement;
}

export function MemberPopover({ member, children }: MemberPopoverProps) {
  const { styles } = useStyles();

  return (
    <Popover
      trigger="click"
      placement="rightTop"
      arrow={false}
      destroyOnHidden
      classNames={{ container: styles.surface }}
      styles={{ container: { padding: 0 }, content: { padding: 0 } }}
      content={<MemberCard member={member} />}
    >
      {children}
    </Popover>
  );
}
