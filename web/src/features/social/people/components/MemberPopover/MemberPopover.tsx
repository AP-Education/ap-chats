import { Popover, theme } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactElement } from 'react';

import { useIsNarrowLayout } from '@/shared/hooks/useIsNarrowLayout';

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
  const { token } = theme.useToken();
  const isNarrowLayout = useIsNarrowLayout();

  return (
    <Popover
      trigger="click"
      placement={isNarrowLayout ? 'bottom' : 'rightTop'}
      arrow={false}
      autoAdjustOverflow
      zIndex={isNarrowLayout ? token.zIndexPopupBase + 100 : undefined}
      destroyOnHidden
      classNames={{ container: styles.surface }}
      styles={{ container: { padding: 0 }, content: { padding: 0 } }}
      content={<MemberCard member={member} />}
    >
      {children}
    </Popover>
  );
}
