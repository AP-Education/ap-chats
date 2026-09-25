import { ListIcon } from '@phosphor-icons/react';
import { Button, Drawer, Grid, Layout, Spin, theme } from 'antd';
import { Suspense, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { AuthStatus } from '../../features/auth/components/AuthStatus';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { PageSection } from '../../shared/ui/PageSection/PageSection';
import { MainSider, MainSiderMenu } from './MainSider';
import { useMainLayoutStyles } from './useMainLayoutStyles';

export function MainLayout() {
  const { styles } = useMainLayoutStyles();
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  const [isMenuOpen, setMenuOpen] = useState(false);

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
            <Link to="/" className={styles.brand} aria-label="AP Connect">
              <span className={styles.brandMark}>AP</span>
            </Link>
          </div>
          <AuthStatus />
        </div>
      </Layout.Header>
      <ConnectionBanner />
      <Layout className={styles.mainArea}>
        {!isMobile && <MainSider />}
        <Layout.Content
          className={styles.content}
          style={{ padding: isMobile ? 0 : token.paddingXS }}
        >
          <Suspense fallback={<Spin size="large" />}>
            <PageSection>
              <Outlet />
            </PageSection>
          </Suspense>
        </Layout.Content>
      </Layout>
      <Drawer
        title={
          <Link
            to="/"
            className={styles.brand}
            aria-label="AP Connect"
            onClick={() => setMenuOpen(false)}
          >
            <span className={styles.brandMark}>AP</span>
            <span className={styles.brandText}>AP Connect</span>
          </Link>
        }
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
