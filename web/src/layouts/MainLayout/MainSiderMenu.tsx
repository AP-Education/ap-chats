import { ChatsCircleIcon, HouseIcon, VideoCameraIcon } from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';

import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { useMainLayoutStyles } from './useMainLayoutStyles';

const navItems = [
  { key: '/', icon: HouseIcon, label: 'Головна' },
  { key: '/calls', icon: VideoCameraIcon, label: 'Дзвінки' },
  { key: '/messages', icon: ChatsCircleIcon, label: 'Особисті' },
];

export function MainSiderMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { styles, cx } = useMainLayoutStyles();
  const { pathname } = useLocation();

  return (
    <div className={styles.sidebarStack}>
      <nav className={styles.nav}>
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = pathname === key;
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
      <div className={styles.navDivider} />
      <div className={styles.channelSection}>
        <ChannelsSidebar onNavigate={onNavigate} />
      </div>
    </div>
  );
}
