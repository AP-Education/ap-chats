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
  const isEdgeToEdge = isChatPage || pathname.startsWith('/calls') || pathname === '/';
  const isNavigationPage = pathname === '/channels' || pathname === '/direct';
  const [menuOverride, setMenuOverride] = useState<{ locationKey: string; open: boolean } | null>(
    null,
  );
  const isMenuOpen =
    isMobile && (menuOverride?.locationKey === locationKey ? menuOverride.open : isNavigationPage);
  const wasMenuOpen = useRef(false);
  const setMenuOpen = useCallback(
    (open: boolean) => setMenuOverride({ locationKey, open }),
    [locationKey],
  );
  const unreadCount = (unread?.channelTotal ?? 0) + (unread?.directTotal ?? 0);
  const sheet = useMobileNavSheet({
    open: isMenuOpen,
    onOpen: () => setMenuOpen(true),
    onClose: () => setMenuOpen(false),
  });

  useEffect(() => {
    if (isMenuOpen) {
      sheet.panelRef.current?.focus();
      wasMenuOpen.current = true;
    } else if (wasMenuOpen.current) {
      document.querySelector<HTMLButtonElement>('[data-mobile-menu-trigger]')?.focus();
      wasMenuOpen.current = false;
    }
    // sheet.panelRef is a stable ref object from useMobileNavSheet, not reactive state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen]);

  const mobileMenu = useMemo(
    () => ({ open: () => setMenuOpen(true), isOpen: isMenuOpen, unreadCount }),
    [isMenuOpen, setMenuOpen, unreadCount],
  );

  return (
    <Layout className={styles.layout}>
      <CallSurface />
      <ConnectionBanner />
      <Layout className={styles.mainArea}>
        {!isMobile && <MainSider />}
        {isMobile && (
          <aside
            id="mobile-navigation"
            // react-hooks/refs doesn't yet recognize a ref returned from a custom
            // hook as safe in a `ref=` attribute (confirmed false positive, not an
            // actual render-time `.current` read) — same below for spreading a
            // handler object that closes over refs internally.
            // eslint-disable-next-line react-hooks/refs
            ref={sheet.panelRef}
            className={styles.mobilePanel}
            data-open={isMenuOpen}
            aria-label="Навігація та розмови"
            tabIndex={-1}
            inert={!isMenuOpen}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false);
            }}
            // eslint-disable-next-line react-hooks/refs
            {...sheet.closeGesture}
          >
            <MainSiderMenu onNavigate={() => setMenuOpen(false)} />
          </aside>
        )}
        <Layout.Content
          // eslint-disable-next-line react-hooks/refs
          ref={sheet.contentRef}
          className={styles.content}
          data-menu-open={isMobile && isMenuOpen}
          style={{ padding: isMobile || isEdgeToEdge ? 0 : token.paddingXS }}
          inert={isMobile && isMenuOpen}
          // eslint-disable-next-line react-hooks/refs
          {...(isMobile ? sheet.openGesture : {})}
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
