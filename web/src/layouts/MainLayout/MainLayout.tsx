import { ListIcon } from '@phosphor-icons/react';
import { Button, Drawer, Layout, Skeleton, theme } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AuthStatus } from '../../features/auth/components/AuthStatus';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { WorkspaceSwitcher } from '../../features/workspaces/components/WorkspaceSwitcher';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { ChatLoading } from '../../shared/ui/ChatLayout/ChatLoading';
import { PageSection } from '../../shared/ui/PageSection/PageSection';
import { MainSider } from './MainSider';
import { MainSiderMenu } from './MainSiderMenu';
import { MobileMenuContext } from './stores/mobile-menu-context';
import { useMainLayoutStyles } from './useMainLayoutStyles';

export function MainLayout() {
  const { styles } = useMainLayoutStyles();
  const { token } = theme.useToken();
  const isMobile = useIsMobile();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isChannelPage = pathname.startsWith('/channels') || pathname.startsWith('/messages');
  const mobileMenu = useMemo(() => ({ open: () => setMenuOpen(true) }), []);

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            {isMobile && (
              <Button
                type="text"
                icon={<ListIcon />}
                aria-label="Відкрити меню"
                className={styles.menuButton}
                onClick={() => setMenuOpen(true)}
              />
            )}
            <WorkspaceSwitcher />
          </div>
          <AuthStatus />
        </div>
      </Layout.Header>
      <ConnectionBanner />
      <Layout className={styles.mainArea}>
        {!isMobile && <MainSider />}
        <Layout.Content
          className={styles.content}
          style={{ padding: isMobile || isChannelPage ? 0 : token.paddingXS }}
        >
          <PageSection
            maxWidth={isChannelPage ? 'none' : 1920}
            style={isChannelPage ? { padding: 0, borderRadius: 0 } : undefined}
          >
            <MobileMenuContext.Provider value={mobileMenu}>
              <Suspense
                fallback={
                  isChannelPage ? (
                    <ChatLoading />
                  ) : (
                    <div role="status" aria-label="Завантажуємо сторінку" style={{ padding: 24 }}>
                      <Skeleton active paragraph={{ rows: 4 }} />
                    </div>
                  )
                }
              >
                <Outlet />
              </Suspense>
            </MobileMenuContext.Provider>
          </PageSection>
        </Layout.Content>
      </Layout>
      <Drawer
        title={<WorkspaceSwitcher />}
        placement="left"
        open={isMobile && isMenuOpen}
        onClose={() => setMenuOpen(false)}
        width={320}
        className={styles.mobileDrawer}
      >
        <MainSiderMenu onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </Layout>
  );
}
