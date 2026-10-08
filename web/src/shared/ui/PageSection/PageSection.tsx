import { createStyles } from 'antd-style';
import type { CSSProperties, PropsWithChildren } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    width: 100%;
    height: 100%;
    margin: 0 auto;
    padding: ${token.paddingLG}px;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;

    @media (max-width: ${token.screenMD}px) {
      padding: ${token.paddingSM}px;
    }
  `,
}));

interface PageSectionProps {
  maxWidth?: number | string;
  style?: CSSProperties;
}

// The one place page width is capped, applied once by ChatsContent; pages don't
// opt in individually. 1920px only kicks in on external/ultra-wide monitors,
// leaving normal laptop windows (even maximized) unconstrained. Edge-to-edge
// pages (conversations, calls) override padding to 0 via `style`.
export function PageSection({
  maxWidth = 1920,
  style,
  children,
}: PropsWithChildren<PageSectionProps>) {
  const { styles } = useStyles();
  return (
    <div className={styles.section} style={{ maxWidth, ...style }}>
      {children}
    </div>
  );
}
