import { Layout, Skeleton, theme } from 'antd';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';

import { CallSurface } from '../../features/calls/components/CallSurface';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { useWorkspaceUnreadTotal } from '../../features/social/read-state/hooks/useWorkspaceUnreadTotal';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
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
  const { workspace } = useActiveWorkspace();
  const { pathname, key: locationKey } = useLocation();
  const isChatPage = pathname.startsWith('/channels') || pathname.startsWith('/direct');
  const isEdgeToEdge = isChatPage || pathname.startsWith('/calls') || pathname === '/';
  const isConversation = useIsConversationRoute();
  const isNavigationPage = pathname === '/channels' || pathname === '/direct';
  const [menuOverride, setMenuOverride] = useState<{ locationKey: string; open: boolean } | null>(
    null,
  );
  const isMenuOpen =
    isMobile && (menuOverride?.locationKey === locationKey ? menuOverride.open : isNavigationPage);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const wasMenuOpen = useRef(false);
  const setMenuOpen = useCallback(
    (open: boolean) => setMenuOverride({ locationKey, open }),
    [locationKey],
  );
  const unreadCount = useWorkspaceUnreadTotal(workspace?.id);

  useEffect(() => {
    if (isMenuOpen) {
      mobilePanelRef.current?.focus();
      wasMenuOpen.current = true;
    } else if (wasMenuOpen.current) {
      document.querySelector<HTMLButtonElement>('[data-mobile-menu-trigger]')?.focus();
      wasMenuOpen.current = false;
    }
  }, [isMenuOpen]);

  const mobileMenu = useMemo(
    () => ({ open: () => setMenuOpen(true), isConversation, isOpen: isMenuOpen, unreadCount }),
    [isConversation, isMenuOpen, setMenuOpen, unreadCount],
  );
  const openGesture = useTouchGesture({
    shouldStart: (event) => event.touches[0].clientX <= 28,
    onSwipeRight: () => setMenuOpen(true),
  });
  const closeGesture = useTouchGesture({ onSwipeLeft: () => setMenuOpen(false) });

  return (
    <Layout className={styles.layout}>
      <CallSurface />
      <ConnectionBanner />
      <Layout className={styles.mainArea}>
        {!isMobile && <MainSider />}
        {isMobile && (
          <aside
            id="mobile-navigation"
            ref={mobilePanelRef}
            className={styles.mobilePanel}
            data-open={isMenuOpen}
            aria-label="Навігація та розмови"
            tabIndex={-1}
            inert={!isMenuOpen}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false);
            }}
            {...closeGesture}
          >
            <MainSiderMenu onNavigate={() => setMenuOpen(false)} />
          </aside>
        )}
        <Layout.Content
          className={styles.content}
          data-menu-open={isMobile && isMenuOpen}
          style={{ padding: isMobile || isEdgeToEdge ? 0 : token.paddingXS }}
          inert={isMobile && isMenuOpen}
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
    </Layout>
  );
}
