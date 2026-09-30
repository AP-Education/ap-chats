import { ListIcon } from '@phosphor-icons/react';
import { Button, Drawer, Layout, Skeleton, theme } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';

import { CallSurface } from '../../features/calls/components/CallSurface';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
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
  const isChatPage = pathname.startsWith('/channels') || pathname.startsWith('/direct');
  // Calls shares the chat surfaces' edge-to-edge canvas (no padded, rounded
  // card) even though it isn't itself a chat: a floating card read as
  // inconsistent chrome next to channels/direct sharing the same sider.
  const isEdgeToEdge = isChatPage || pathname.startsWith('/calls');
  const mobileMenu = useMemo(() => ({ open: () => setMenuOpen(true) }), []);

  return (
    <Layout className={styles.layout}>
      <CallSurface />
      {isMobile && (
        <div className={styles.mobileBar}>
          <Button
            type="text"
            icon={<ListIcon size={22} />}
            aria-label="Відкрити меню"
            className={styles.menuButton}
            onClick={() => setMenuOpen(true)}
          />
        </div>
      )}
      <ConnectionBanner />
      <Layout className={styles.mainArea}>
        {!isMobile && <MainSider />}
        <Layout.Content
          className={styles.content}
          style={{ padding: isMobile || isEdgeToEdge ? 0 : token.paddingXS }}
        >
          <PageSection
            maxWidth={isEdgeToEdge ? 'none' : 1920}
            style={isEdgeToEdge ? { padding: 0, borderRadius: 0 } : undefined}
          >
            <MobileMenuContext.Provider value={mobileMenu}>
              <Suspense
                fallback={
                  isChatPage ? (
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
        title="Меню"
        placement="left"
        open={isMobile && isMenuOpen}
        onClose={() => setMenuOpen(false)}
        width={290}
        className={styles.mobileDrawer}
      >
        <MainSiderMenu onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </Layout>
  );
}
