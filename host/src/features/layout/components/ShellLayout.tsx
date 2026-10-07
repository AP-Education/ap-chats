import { MOBILE_MENU_TRIGGER_ATTRIBUTE, MobileMenuContext } from '@ap/shell-sdk';
import { useIsMobile, useSwipeDrawer } from '@ap/ui';
import { Layout } from 'antd';
import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useShellLayoutStyles } from '@/features/layout/hooks/useShellLayoutStyles';
import {
  ShellFrameContext,
  type ShellFrameContextValue,
  type ShellHosts,
  ShellHostsContext,
  type ShellHostsContextValue,
} from '@/features/layout/stores/shell-layout-context';

import { AppRail, type RailTile } from './AppRail';
import {
  ShellBanner,
  ShellBody,
  ShellContent,
  ShellFooter,
  ShellMain,
  ShellPanel,
  ShellSider,
} from './ShellLayoutParts';

interface ShellLayoutProps {
  locationKey: string;
  /** Whether the mobile navigation sheet is open before the user touches it. */
  menuOpenByDefault: boolean;
  badgeCount: number;
  tiles: RailTile[];
  footer: ReactNode;
}

/**
 * The frame every application renders into: rail and panel in the sider, content beside it,
 * a banner strip above. `children` mount the applications, which portal into these slots.
 */
export function ShellLayout({
  locationKey,
  menuOpenByDefault,
  badgeCount,
  tiles,
  footer,
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
  const sheet = useSwipeDrawer({
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
        .querySelector<HTMLButtonElement>(`[${MOBILE_MENU_TRIGGER_ATTRIBUTE}]`)
        ?.focus({ preventScroll: true });
      wasMenuOpen.current = false;
    }
  }, [isMenuOpen]);

  const mobileMenu = useMemo(
    () => ({ open: openMenu, isOpen: isMenuOpen, badgeCount }),
    [isMenuOpen, openMenu, badgeCount],
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
          <Layout className={styles.layout}>
            <ShellBanner />
            <ShellBody>
              <ShellSider>
                <ShellMain>
                  <AppRail tiles={tiles} />
                  <ShellPanel />
                </ShellMain>
                <ShellFooter>{footer}</ShellFooter>
              </ShellSider>
              <ShellContent />
            </ShellBody>
            {children}
          </Layout>
        </MobileMenuContext.Provider>
      </ShellFrameContext.Provider>
    </ShellHostsContext.Provider>
  );
}
