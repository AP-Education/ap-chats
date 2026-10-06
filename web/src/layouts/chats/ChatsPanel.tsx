import { useIsMobile } from '@ap/shell-ui';
import { ChatsIcon, ChatTextIcon, HouseIcon, PhoneIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceHeader } from '../../features/workspaces/components/WorkspaceHeader';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ChannelsNavBadge } from './ChannelsNavBadge';
import { DirectMessagesNavBadge } from './DirectMessagesNavBadge';
import { useChatsLayoutStyles } from './useChatsLayoutStyles';

type NavKey = '/' | '/channels' | '/direct' | '/calls';

const navItems: { key: NavKey; icon: typeof HouseIcon; label: string }[] = [
  { key: '/', icon: HouseIcon, label: 'Головна' },
  { key: '/channels', icon: ChatsIcon, label: 'Чати' },
  { key: '/direct', icon: ChatTextIcon, label: 'Особисті' },
  { key: '/calls', icon: PhoneIcon, label: 'Дзвінки' },
];

type ConversationSection = 'channels' | 'direct';

export function ChatsPanel() {
  const { styles, cx } = useChatsLayoutStyles();
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
        <WorkspaceHeader />
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
            <Link key={key} to={key} className={cx(styles.navItem, active && styles.navItemActive)}>
              {content}
            </Link>
          );
        })}
      </nav>
      {workspace && (!isMobile || listSection === 'channels') && <UnreadDirectMessages />}
      <div className={styles.navDivider} />
      {isMobile ? (
        <>
          <div
            className={cx(
              styles.channelSection,
              listSection !== 'channels' && styles.channelSectionHidden,
            )}
          >
            <ChannelsSidebar />
          </div>
          {workspace && (
            <div
              className={cx(
                styles.channelSection,
                listSection !== 'direct' && styles.channelSectionHidden,
              )}
            >
              <DirectMessageList workspaceId={workspace.id} />
            </div>
          )}
        </>
      ) : (
        <div className={styles.channelSection}>
          {pathname.startsWith('/direct') && workspace ? (
            <DirectMessageList workspaceId={workspace.id} />
          ) : (
            <ChannelsSidebar />
          )}
        </div>
      )}
    </div>
  );
}
