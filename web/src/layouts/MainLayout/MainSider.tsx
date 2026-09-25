import { ChatsCircleIcon, HashIcon, SquaresFourIcon, VideoCameraIcon } from '@phosphor-icons/react';
import { Layout, Menu } from 'antd';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { WorkspaceList } from '../../features/workspaces/components/WorkspaceList';
import { useMainLayoutStyles } from './useMainLayoutStyles';

const items = [
  { key: '/', icon: <SquaresFourIcon />, label: <Link to="/">Огляд</Link> },
  { key: '/channels', icon: <HashIcon />, label: <Link to="/channels">Канали</Link> },
  {
    key: '/messages',
    icon: <ChatsCircleIcon />,
    label: <Link to="/messages">Повідомлення</Link>,
  },
  { key: '/calls', icon: <VideoCameraIcon />, label: <Link to="/calls">Дзвінки</Link> },
];

export function MainSiderMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { styles } = useMainLayoutStyles();
  const { pathname } = useLocation();
  return (
    <div className={styles.sidebarStack}>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={items}
        onClick={onNavigate}
        className={styles.sidebarMenu}
      />
      <WorkspaceList onNavigate={onNavigate} />
    </div>
  );
}

export function MainSider() {
  const { styles } = useMainLayoutStyles();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sider-collapsed') === 'true',
  );

  function handleCollapse(value: boolean) {
    setCollapsed(value);
    localStorage.setItem('sider-collapsed', String(value));
  }

  return (
    <Layout.Sider
      className={styles.sidebar}
      collapsible
      theme="light"
      collapsed={collapsed}
      collapsedWidth={72}
      width={collapsed ? 72 : 264}
      style={{
        width: collapsed ? 72 : 264,
        minWidth: collapsed ? 72 : 264,
        height: '100%',
        overflow: 'auto',
      }}
      onCollapse={handleCollapse}
    >
      <MainSiderMenu />
    </Layout.Sider>
  );
}
