import {
  AppstoreOutlined,
  MessageOutlined,
  NumberOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
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

export function MainSider({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const menu = (
    <div className={styles.sidebarContent}>
      <Typography.Text type="secondary" className={styles.sidebarLabel}>
        РОБОЧИЙ ПРОСТІР
      </Typography.Text>
      <Menu mode="inline" selectedKeys={[pathname]} items={items} onClick={onNavigate} />
    </div>
  );
  return mobile ? (
    menu
  ) : (
    <Layout.Sider width={256} theme="light" className={styles.sidebar}>
      {menu}
    </Layout.Sider>
  );
}
