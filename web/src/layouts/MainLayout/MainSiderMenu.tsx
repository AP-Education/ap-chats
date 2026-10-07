import { ChatsIcon, ChatTextIcon, HouseIcon, PhoneIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useIsMobile } from '@/shared/hooks/useIsMobile';

import { AuthStatus } from '../../features/auth/components/AuthStatus';
import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { PushSettings } from '../../features/notifications/components/PushSettings';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WallpaperSettings } from '../../features/social/wallpaper/components/WallpaperSettings/WallpaperSettings';
import { WorkspaceSwitcher } from '../../features/workspaces/components/WorkspaceSwitcher';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ChannelsNavBadge } from './ChannelsNavBadge';
import { DirectMessagesNavBadge } from './DirectMessagesNavBadge';
import { useMainLayoutStyles } from './useMainLayoutStyles';

type NavKey = '/' | '/channels' | '/direct' | '/calls';

const navItems: { key: NavKey; icon: typeof HouseIcon; label: string }[] = [
  { key: '/', icon: HouseIcon, label: 'Головна' },
  { key: '/channels', icon: ChatsIcon, label: 'Чати' },
  { key: '/direct', icon: ChatTextIcon, label: 'Особисті' },
  { key: '/calls', icon: PhoneIcon, label: 'Дзвінки' },
];

type ConversationSection = 'channels' | 'direct';

export function MainSiderMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { styles, cx } = useMainLayoutStyles();
  const { pathname, key: locationKey } = useLocation();
  const { workspace } = useActiveWorkspace();
  const isMobile = useIsMobile();
  const [selection, setSelection] = useState<{
    locationKey: string;
    section: ConversationSection;
  } | null>(null);
  const routeSection = pathname.startsWith('/direct')
    ? 'direct'
    : pathname.startsWith('/channels')
      ? 'channels'
      : null;
  const hasSelection = selection?.locationKey === locationKey;
  const activeSection = hasSelection ? selection.section : routeSection;
  const listSection = activeSection ?? 'channels';

  return (
    <div className={styles.sidebarStack}>
      <div className={styles.sidebarWorkspace}>
        <WorkspaceSwitcher />
      </div>
      <nav className={styles.nav}>
        {navItems.map(({ key, icon: Icon, label }) => {
          const section = key === '/channels' ? 'channels' : key === '/direct' ? 'direct' : null;
          const routeActive = pathname === key || (key !== '/' && pathname.startsWith(`${key}/`));
          const active = isMobile
            ? section
              ? activeSection === section
              : !hasSelection && routeActive
            : routeActive;
          const content = (
            <>
              <Icon size={isMobile ? 22 : 20} weight={active ? 'fill' : 'regular'} />
              <span className={styles.navLabel}>{label}</span>
              {workspace && key === '/channels' && <ChannelsNavBadge />}
              {workspace && key === '/direct' && <DirectMessagesNavBadge />}
            </>
          );

          if (isMobile && section) {
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setSelection({ locationKey, section })}
                className={cx(styles.navItem, active && styles.navItemActive)}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={key}
              to={key}
              onClick={onNavigate}
              className={cx(styles.navItem, active && styles.navItemActive)}
            >
              {content}
            </Link>
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
        </>
      ) : (
        <div className={styles.channelSection}>
          {pathname.startsWith('/direct') && workspace ? (
            <DirectMessageList workspaceId={workspace.id} onNavigate={onNavigate} />
          ) : (
            <ChannelsSidebar onNavigate={onNavigate} />
          )}
        </div>
      )}
      <div className={styles.sidebarProfile}>
        <AuthStatus
          actions={
            <>
              <WallpaperSettings />
              <PushSettings />
            </>
          }
        />
      </div>
    </div>
  );
}
