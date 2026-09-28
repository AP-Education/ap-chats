import { ChatsCircleIcon, ChatsIcon, HouseIcon, VideoCameraIcon } from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';

import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { useMainLayoutStyles } from './useMainLayoutStyles';

const navItems = [
  { key: '/', icon: HouseIcon, label: 'Головна' },
  { key: '/channels', icon: ChatsIcon, label: 'Чати' },
  { key: '/direct', icon: ChatsCircleIcon, label: 'Особисті' },
  { key: '/calls', icon: VideoCameraIcon, label: 'Дзвінки' },
];

export function MainSiderMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { styles, cx } = useMainLayoutStyles();
  const { pathname } = useLocation();
  const { workspace } = useActiveWorkspace();

  return (
    <div className={styles.sidebarStack}>
      <nav className={styles.nav}>
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = pathname === key || (key !== '/' && pathname.startsWith(`${key}/`));
          return (
            <Link
              key={key}
              to={key}
              onClick={onNavigate}
              className={cx(styles.navItem, active && styles.navItemActive)}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {workspace && <UnreadDirectMessages workspaceId={workspace.id} onNavigate={onNavigate} />}
      <div className={styles.navDivider} />
      <div className={styles.channelSection}>
        {pathname.startsWith('/direct') && workspace ? (
          <DirectMessageList workspaceId={workspace.id} onNavigate={onNavigate} />
        ) : (
          <ChannelsSidebar onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}
