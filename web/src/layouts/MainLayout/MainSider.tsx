import {
  AppstoreOutlined,
  MessageOutlined,
  NumberOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import styles from './MainLayout.module.css';

const items = [
  { key: '/', icon: <AppstoreOutlined />, label: <Link to="/">Огляд</Link> },
  { key: '/channels', icon: <NumberOutlined />, label: <Link to="/channels">Канали</Link> },
  {
    key: '/messages',
    icon: <MessageOutlined />,
    label: <Link to="/messages">Повідомлення</Link>,
  },
  { key: '/calls', icon: <VideoCameraOutlined />, label: <Link to="/calls">Дзвінки</Link> },
];

export function MainSiderMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      items={items}
      onClick={onNavigate}
      className={styles.sidebarMenu}
    />
  );
}

export function MainSider() {
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
