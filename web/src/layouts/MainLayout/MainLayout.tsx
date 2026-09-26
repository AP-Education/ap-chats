import { ListIcon } from '@phosphor-icons/react';
import { Button, Drawer, Grid, Layout, Spin, theme } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AuthStatus } from '../../features/auth/components/AuthStatus';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { WorkspaceSwitcher } from '../../features/workspaces/components/WorkspaceSwitcher';
import { PageSection } from '../../shared/ui/PageSection/PageSection';
import { MainSider } from './MainSider';
import { MainSiderMenu } from './MainSiderMenu';
import { MobileMenuContext } from './stores/mobile-menu-context';
import { useMainLayoutStyles } from './useMainLayoutStyles';

export function MainLayout() {
  const { styles } = useMainLayoutStyles();
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  const [isMenuOpen, setMenuOpen] = useState(false);
  const isChannelPage = useLocation().pathname.startsWith('/channels');
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
          <Suspense fallback={<Spin size="large" />}>
            <PageSection
              maxWidth={isChannelPage ? 'none' : 1920}
              style={isChannelPage ? { padding: 0, borderRadius: 0 } : undefined}
            >
              <MobileMenuContext.Provider value={mobileMenu}>
                <Outlet />
              </MobileMenuContext.Provider>
            </PageSection>
          </Suspense>
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
