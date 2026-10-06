import { Layout } from 'antd';
import type { PropsWithChildren } from 'react';

import { AppRail } from '../rail/AppRail';
import type { RailApp } from '../rail/types';
import { useShellFrame, useShellHostRef } from './shell-layout-context';
import { useShellLayoutStyles } from './useShellLayoutStyles';

/** Rail (64px) plus the 290px panel the sider had before the rail existed. */
const SIDER_WIDTH = 354;

/** Strip above the whole layout; applications portal banners and ongoing activity into it. */
export function ShellBanner() {
  const bannerRef = useShellHostRef('banner');
  return <div ref={bannerRef} />;
}

export function ShellBody({ children }: PropsWithChildren) {
  const { styles } = useShellLayoutStyles();
  const { isMenuOpen, sheet, bodyRef } = useShellFrame();

  return (
    <Layout
      ref={bodyRef}
      className={styles.mainArea}
      data-menu-open={isMenuOpen}
      data-menu-dragging={sheet.dragging || undefined}
      style={sheet.style}
    >
      {children}
    </Layout>
  );
}

/** A fixed sider on desktop, a swipeable sheet on mobile. */
export function ShellSider({ children }: PropsWithChildren) {
  const { styles } = useShellLayoutStyles();
  const { isMobile, isMenuOpen, closeMenu, sheet, drawerRef } = useShellFrame();
  const body = <div className={styles.siderBody}>{children}</div>;

  if (!isMobile) {
    return (
      <Layout.Sider
        className={styles.sidebar}
        theme="light"
        width={SIDER_WIDTH}
        style={{ width: SIDER_WIDTH, minWidth: SIDER_WIDTH, height: '100%', overflow: 'hidden' }}
      >
        {body}
      </Layout.Sider>
    );
  }

  return (
    <aside
      id="mobile-navigation"
      ref={drawerRef}
      className={styles.mobilePanel}
      aria-label="Навігація та розмови"
      tabIndex={-1}
      inert={!isMenuOpen}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeMenu();
      }}
      {...sheet.closeGesture}
    >
      {body}
    </aside>
  );
}

interface ShellRailProps {
  tiles: RailApp[];
  onSelect: (id: string) => void;
  onPrefetch: (id: string) => void;
}

/** Application tiles, then the tiles applications contribute through their own `Rail`. */
export function ShellRail({ tiles, onSelect, onPrefetch }: ShellRailProps) {
  const railRef = useShellHostRef('rail');
  return (
    <AppRail
      tiles={tiles}
      onSelect={onSelect}
      onPrefetch={onPrefetch}
      setContributionHost={railRef}
    />
  );
}

/** The rail and the panel side by side, above the footer. */
export function ShellMain({ children }: PropsWithChildren) {
  const { styles } = useShellLayoutStyles();
  return <div className={styles.siderMain}>{children}</div>;
}

/** Where the active application's panel is portalled. */
export function ShellPanel() {
  const { styles } = useShellLayoutStyles();
  const panelRef = useShellHostRef('panel');
  return <div ref={panelRef} className={styles.panelHost} />;
}

/** Spans the whole sider, under both the rail and the panel. */
export function ShellFooter({ children }: PropsWithChildren) {
  const { styles } = useShellLayoutStyles();
  return <div className={styles.footer}>{children}</div>;
}

/** Where the active application's content is portalled. */
export function ShellContent() {
  const { styles } = useShellLayoutStyles();
  const { isMobile, isMenuOpen, sheet } = useShellFrame();
  const contentRef = useShellHostRef('content');

  return (
    <Layout.Content
      className={styles.content}
      inert={isMobile && isMenuOpen}
      {...sheet.openGesture}
    >
      <div ref={contentRef} className={styles.contentHost} />
    </Layout.Content>
  );
}
