import { Grid } from 'antd';
import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    height: 100%;
    min-height: 0;
  `,
  list: css`
    width: 300px;
    flex-shrink: 0;
    min-height: 0;
    overflow-y: auto;
    border-right: 1px solid ${token.colorBorderSecondary};
  `,
  main: css`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `,
  aside: css`
    width: 280px;
    flex-shrink: 0;
    min-height: 0;
    overflow-y: auto;
    border-left: 1px solid ${token.colorBorderSecondary};
  `,
}));

interface ChatLayoutProps {
  list: ReactNode;
  aside?: ReactNode;
}

// list/aside are fixed-width panes, main fills whatever's left — the standard
// IM shape (Slack/Discord). Sits on PageSection's own white canvas (pass
// style={{ padding: 0 }} to PageSection for the edge-to-edge look). On mobile
// only `children` shows; list vs. detail is a routing concern for the real page.
export function ChatLayout({ list, aside, children }: PropsWithChildren<ChatLayoutProps>) {
  const { styles } = useStyles();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div className={styles.shell}>
      {!isMobile && <div className={styles.list}>{list}</div>}
      <div className={styles.main}>{children}</div>
      {!isMobile && aside && <div className={styles.aside}>{aside}</div>}
    </div>
  );
}
