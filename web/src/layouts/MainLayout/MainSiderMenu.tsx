import { ChatsIcon, ChatTextIcon, HouseIcon, PhoneIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useIsMobile } from '@/shared/hooks/useIsMobile';

import { AuthStatus } from '../../features/auth/components/AuthStatus';
import { CallHistoryList } from '../../features/calls/components/CallHistoryList/CallHistoryList';
import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { PushSettings } from '../../features/notifications/components/PushSettings';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceSwitcher } from '../../features/workspaces/components/WorkspaceSwitcher';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ChannelsNavBadge } from './ChannelsNavBadge';
import { DirectMessagesNavBadge } from './DirectMessagesNavBadge';
import { useMainLayoutStyles } from './useMainLayoutStyles';

type SidebarSection = 'channels' | 'direct' | 'calls';

const sectionItems: {
  section: SidebarSection;
  path?: '/channels' | '/direct';
  icon: typeof HouseIcon;
  label: string;
}[] = [
  { section: 'channels', path: '/channels', icon: ChatsIcon, label: 'Чати' },
  { section: 'direct', path: '/direct', icon: ChatTextIcon, label: 'Особисті' },
  { section: 'calls', icon: PhoneIcon, label: 'Дзвінки' },
];

function isWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavItemLabel({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof HouseIcon;
  label: string;
  active: boolean;
}) {
  const { styles } = useMainLayoutStyles();
  const isMobile = useIsMobile();

  return (
    <>
      <Icon size={isMobile ? 22 : 20} weight={active ? 'fill' : 'regular'} />
      <span className={styles.navLabel}>{label}</span>
    </>
  );
}

function DesktopSectionList({ section }: { section: SidebarSection | null }) {
  const { workspace } = useActiveWorkspace();

  if (workspace && section === 'direct') return <DirectMessageList workspaceId={workspace.id} />;
  if (workspace && section === 'calls') return <CallHistoryList workspaceId={workspace.id} />;
  return <ChannelsSidebar />;
}

export function MainSiderMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { styles, cx } = useMainLayoutStyles();
  const { pathname, key: locationKey } = useLocation();
  const { workspace } = useActiveWorkspace();
  const isMobile = useIsMobile();
  const [chosen, setChosen] = useState<{
    locationKey: string;
    section: SidebarSection;
  } | null>(null);
  const routeSection =
    sectionItems.find(({ path }) => path && isWithin(pathname, path))?.section ?? null;
  // Calls have no route to reflect them, so picking calls survives navigation until another section is picked.
  const chosenSection =
    chosen && (chosen.section === 'calls' || chosen.locationKey === locationKey)
      ? chosen.section
      : null;
  const activeSection = chosenSection ?? routeSection;
  const listSection = activeSection ?? 'channels';
  const homeActive = !chosenSection && pathname === '/';

  function followRoute() {
    setChosen(null);
    onNavigate?.();
  }

  return (
    <div className={styles.sidebarStack}>
      <div className={styles.sidebarWorkspace}>
        <WorkspaceSwitcher />
      </div>
      <nav className={styles.nav}>
        <Link
          to="/"
          onClick={followRoute}
          className={cx(styles.navItem, homeActive && styles.navItemActive)}
        >
          <NavItemLabel icon={HouseIcon} label="Головна" active={homeActive} />
        </Link>
        {sectionItems.map(({ section, path, icon, label }) => {
          const active = activeSection === section;
          const content = (
            <>
              <NavItemLabel icon={icon} label={label} active={active} />
              {workspace && section === 'channels' && <ChannelsNavBadge />}
              {workspace && section === 'direct' && <DirectMessagesNavBadge />}
            </>
          );

          if (path && !isMobile) {
            return (
              <Link
                key={section}
                to={path}
                onClick={followRoute}
                className={cx(styles.navItem, active && styles.navItemActive)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={section}
              type="button"
              aria-pressed={active}
              onClick={() => setChosen({ locationKey, section })}
              className={cx(styles.navItem, active && styles.navItemActive)}
            >
              {content}
            </button>
          );
        })}
      </nav>
      {workspace && (!isMobile || listSection === 'channels') && (
        <UnreadDirectMessages onNavigate={onNavigate} />
      )}
      <div className={styles.navDivider} />
      {isMobile ? (
        <>
          <div
            className={cx(
              styles.channelSection,
              listSection !== 'channels' && styles.channelSectionHidden,
            )}
          >
            <ChannelsSidebar onNavigate={onNavigate} />
          </div>
          {workspace && (
            <div
              className={cx(
                styles.channelSection,
                listSection !== 'direct' && styles.channelSectionHidden,
              )}
            >
              <DirectMessageList workspaceId={workspace.id} onNavigate={onNavigate} />
            </div>
          )}
          {workspace && listSection === 'calls' && (
            <div className={styles.channelSection}>
              <CallHistoryList workspaceId={workspace.id} onNavigate={onNavigate} />
            </div>
          )}
        </>
      ) : (
        <div className={styles.channelSection}>
          <DesktopSectionList section={activeSection} />
        </div>
      )}
      <div className={styles.sidebarProfile}>
        <AuthStatus actions={<PushSettings />} />
      </div>
    </div>
  );
}
