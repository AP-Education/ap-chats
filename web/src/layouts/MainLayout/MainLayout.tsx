import { ListIcon } from '@phosphor-icons/react';
import { Button, Drawer, Layout, Skeleton, theme } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';

import { CallSurface } from '../../features/calls/components/CallSurface';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { useTouchGesture } from '../../shared/hooks/useTouchGesture';
import { useIsConversationRoute } from '../../shared/router/conversationRoute';
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
  const isEdgeToEdge = isChatPage || pathname.startsWith('/calls');
  const isConversation = useIsConversationRoute();
  const isNavigationPage = pathname === '/channels' || pathname === '/direct';
  const mobileMenu = useMemo(
    () => ({ open: () => setMenuOpen(true), isConversation }),
    [isConversation],
  );
  const openGesture = useTouchGesture({
    shouldStart: (event) => event.touches[0].clientX <= 28,
    onSwipeRight: () => setMenuOpen(true),
  });
  const closeGesture = useTouchGesture({ onSwipeLeft: () => setMenuOpen(false) });

  return (
    <Layout className={styles.layout}>
      <CallSurface />
      {isMobile && !isConversation && !isNavigationPage && (
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
          {...(isMobile ? openGesture : {})}
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
        placement="left"
        open={isMobile && isMenuOpen}
        onClose={() => setMenuOpen(false)}
        closable={false}
        width="100vw"
        className={styles.mobileDrawer}
      >
        <div className={styles.mobileDrawerContent} {...closeGesture}>
          <MainSiderMenu onNavigate={() => setMenuOpen(false)} />
        </div>
      </Drawer>
    </Layout>
  );
}
