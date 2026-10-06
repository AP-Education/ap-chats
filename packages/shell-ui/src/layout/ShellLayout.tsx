import { MobileMenuContext } from '@ap/shell-sdk';
import { Layout } from 'antd';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIsMobile } from '../hooks/useIsMobile';
import {
  ShellFrameContext,
  type ShellFrameContextValue,
  type ShellHosts,
  ShellHostsContext,
  type ShellHostsContextValue,
} from './shell-layout-context';
import {
  ShellBanner,
  ShellBody,
  ShellContent,
  ShellFooter,
  ShellMain,
  ShellPanel,
  ShellRail,
  ShellSider,
} from './ShellLayoutParts';
import { useMobileNavSheet } from './useMobileNavSheet';
import { useShellLayoutStyles } from './useShellLayoutStyles';

export interface ShellLayoutProps {
  locationKey: string;
  /** Whether the mobile navigation sheet is open before the user touches it. */
  menuOpenByDefault: boolean;
  unreadCount: number;
}

function ShellLayoutRoot({
  locationKey,
  menuOpenByDefault,
  unreadCount,
  children,
}: PropsWithChildren<ShellLayoutProps>) {
  const { styles } = useShellLayoutStyles();
  const isMobile = useIsMobile();
  const [hosts, setHosts] = useState<ShellHosts>({
    banner: null,
    rail: null,
    panel: null,
    content: null,
  });
  const [menuOverride, setMenuOverride] = useState<{ locationKey: string; open: boolean } | null>(
    null,
  );
  const isMenuOpen =
    isMobile && (menuOverride?.locationKey === locationKey ? menuOverride.open : menuOpenByDefault);
  const wasMenuOpen = useRef(false);
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const setMenuOpen = useCallback(
    (open: boolean) => setMenuOverride({ locationKey, open }),
    [locationKey],
  );
  const openMenu = useCallback(() => setMenuOpen(true), [setMenuOpen]);
  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen]);
  const getNavWidth = useCallback(() => bodyRef.current?.clientWidth || window.innerWidth, []);
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
      drawerRef.current?.focus({ preventScroll: true });
      wasMenuOpen.current = true;
    } else if (wasMenuOpen.current) {
      document
        .querySelector<HTMLButtonElement>('[data-mobile-menu-trigger]')
        ?.focus({ preventScroll: true });
      wasMenuOpen.current = false;
    }
  }, [isMenuOpen]);

  const mobileMenu = useMemo(
    () => ({ open: openMenu, isOpen: isMenuOpen, unreadCount }),
    [isMenuOpen, openMenu, unreadCount],
  );
  const setHost = useMemo<ShellHostsContextValue['setHost']>(
    () => ({
      banner: (element) => setHosts((previous) => ({ ...previous, banner: element })),
      rail: (element) => setHosts((previous) => ({ ...previous, rail: element })),
      panel: (element) => setHosts((previous) => ({ ...previous, panel: element })),
      content: (element) => setHosts((previous) => ({ ...previous, content: element })),
    }),
    [],
  );
  const hostsContext = useMemo<ShellHostsContextValue>(
    () => ({ hosts, setHost }),
    [hosts, setHost],
  );
  const frameContext = useMemo<ShellFrameContextValue>(
    () => ({ isMobile, isMenuOpen, closeMenu, sheet, bodyRef, drawerRef }),
    [isMobile, isMenuOpen, closeMenu, sheet],
  );

  return (
    <ShellHostsContext.Provider value={hostsContext}>
      <ShellFrameContext.Provider value={frameContext}>
        <MobileMenuContext.Provider value={mobileMenu}>
          <Layout className={styles.layout}>{children}</Layout>
        </MobileMenuContext.Provider>
      </ShellFrameContext.Provider>
    </ShellHostsContext.Provider>
  );
}

/**
 * The shared application frame: a rail of applications, a panel owned by the active
 * application, and a content area. Compose the parts to build a host.
 *
 * ```tsx
 * <ShellLayout locationKey=... menuOpenByDefault=... unreadCount=...>
 *   <ShellLayout.Banner />
 *   <ShellLayout.Body>
 *     <ShellLayout.Sider>
 *       <ShellLayout.Main>
 *         <ShellLayout.Rail tiles=... onSelect=... onPrefetch=... />
 *         <ShellLayout.Panel />
 *       </ShellLayout.Main>
 *       <ShellLayout.Footer>...</ShellLayout.Footer>
 *     </ShellLayout.Sider>
 *     <ShellLayout.Content />
 *   </ShellLayout.Body>
 * </ShellLayout>
 * ```
 */
export const ShellLayout = Object.assign(ShellLayoutRoot, {
  Banner: ShellBanner,
  Body: ShellBody,
  Sider: ShellSider,
  Rail: ShellRail,
  Main: ShellMain,
  Panel: ShellPanel,
  Footer: ShellFooter,
  Content: ShellContent,
});
