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
  `,
}));

interface PageSectionProps {
  maxWidth?: number | string;
  style?: CSSProperties;
}

// The one place page width is capped, applied once by MainLayout — pages don't
// opt in individually. 1920px only kicks in on external/ultra-wide monitors,
// leaving normal laptop windows (even maximized) unconstrained. Pages that need
// an edge-to-edge shell (ChatLayout) override padding to 0 via `style`.
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
