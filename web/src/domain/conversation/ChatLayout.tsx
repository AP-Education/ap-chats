import { Drawer } from 'antd';
import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

import { useIsNarrowLayout } from '@/shared/hooks/useIsNarrowLayout';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    height: 100%;
    min-height: 0;
  `,
  main: css`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `,
  aside: css`
    width: 300px;
    flex-shrink: 0;
    min-height: 0;
    overflow-y: auto;
    border-left: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
  `,
  drawer: css`
    :global(.ant-drawer-body) {
      padding: 0;
    }
  `,
}));

interface ChatLayoutProps {
  aside?: ReactNode;
  asideOpen?: boolean;
  onCloseAside?: () => void;
}

// main fills whatever's left of the fixed-width aside — the channel/DM list
// itself now lives permanently in MainSider, not in a page-level pane. Sits on
// PageSection's own white canvas (pass style={{ padding: 0 }} to PageSection
// for the edge-to-edge look).
export function ChatLayout({
  aside,
  asideOpen = true,
  onCloseAside,
  children,
}: PropsWithChildren<ChatLayoutProps>) {
  const { styles } = useStyles();
  const isNarrowLayout = useIsNarrowLayout();

  return (
    <div className={styles.shell}>
      <div className={styles.main}>{children}</div>
      {!isNarrowLayout && aside && asideOpen && <aside className={styles.aside}>{aside}</aside>}
      {isNarrowLayout && aside && (
        <Drawer
          open={asideOpen}
          onClose={onCloseAside}
          placement="right"
          width={320}
          closable={false}
          className={styles.drawer}
        >
          {aside}
        </Drawer>
      )}
    </div>
  );
}
