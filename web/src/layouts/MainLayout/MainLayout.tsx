import { Layout, Skeleton, theme } from 'antd';
import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';

import { CallSurface } from '../../features/calls/components/CallSurface';
import { ConnectionBanner } from '../../features/realtime/components/ConnectionBanner';
import { WorkspaceUnreadContext } from '../../features/social/read-state/workspace-unread-context';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { PageSection } from '../../shared/ui/PageSection/PageSection';
import { MainSider } from './MainSider';
import { MainSiderMenu } from './MainSiderMenu';
import { MobileMenuContext } from './stores/mobile-menu-context';
import { useMainLayoutStyles } from './useMainLayoutStyles';
import { useMobileNavSheet } from './useMobileNavSheet';

export function MainLayout() {
  const { styles } = useMainLayoutStyles();
  const { token } = theme.useToken();
  const isMobile = useIsMobile();
  const unread = useContext(WorkspaceUnreadContext);
  const { pathname, key: locationKey } = useLocation();
  const isChatPage = pathname.startsWith('/channels') || pathname.startsWith('/direct');
  const isEdgeToEdge = isChatPage || pathname === '/';
  const isNavigationPage = pathname === '/channels' || pathname === '/direct';
  const [menuOverride, setMenuOverride] = useState<{ locationKey: string; open: boolean } | null>(
    null,
  );
  const isMenuOpen =
    isMobile && (menuOverride?.locationKey === locationKey ? menuOverride.open : isNavigationPage);
  const wasMenuOpen = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setMenuOpen = useCallback(
    (open: boolean) => setMenuOverride({ locationKey, open }),
    [locationKey],
  );
  const unreadCount = (unread?.channelTotal ?? 0) + (unread?.directTotal ?? 0);
  const openMenu = useCallback(() => setMenuOpen(true), [setMenuOpen]);
  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen]);
  const getNavWidth = useCallback(() => containerRef.current?.clientWidth || window.innerWidth, []);
  const sheet = useMobileNavSheet({
    enabled: isMobile,
    open: isMenuOpen,
    locationKey,
    onOpen: openMenu,
    onClose: closeMenu,
    getWidth: getNavWidth,
  });

  useEffect(() => {
    if (isMenuOpen) {
      panelRef.current?.focus({ preventScroll: true });
      wasMenuOpen.current = true;
    } else if (wasMenuOpen.current) {
      document
        .querySelector<HTMLButtonElement>('[data-mobile-menu-trigger]')
        ?.focus({ preventScroll: true });
      wasMenuOpen.current = false;
    }
  }, [isMenuOpen]);

  const mobileMenu = useMemo(
    () => ({ open: () => setMenuOpen(true), isOpen: isMenuOpen, unreadCount }),
    [isMenuOpen, setMenuOpen, unreadCount],
  );

  return (
    <Layout className={styles.layout}>
      <CallSurface />
      <ConnectionBanner />
      <Layout
        ref={containerRef}
        className={styles.mainArea}
        data-menu-open={isMenuOpen}
        data-menu-dragging={sheet.dragging || undefined}
        style={sheet.style}
      >
        {!isMobile && <MainSider />}
        {isMobile && (
          <aside
            id="mobile-navigation"
            ref={panelRef}
            className={styles.mobilePanel}
            aria-label="Навігація та розмови"
            tabIndex={-1}
            inert={!isMenuOpen}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false);
            }}
            {...sheet.closeGesture}
          >
            <MainSiderMenu onNavigate={closeMenu} />
          </aside>
        )}
        <Layout.Content
          className={styles.content}
          style={{ padding: isMobile || isEdgeToEdge ? 0 : token.paddingXS }}
          inert={isMobile && isMenuOpen}
          {...sheet.openGesture}
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
