import { MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid, Layout, Spin, Typography } from 'antd';
import { Suspense, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

import styles from './MainLayout.module.css';
import { MainSider } from './MainSider';

export function MainLayout() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [isMenuOpen, setMenuOpen] = useState(false);

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            aria-label="Відкрити меню"
            onClick={() => setMenuOpen(true)}
          />
        )}
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark}>AP</span>
          <span>Connect</span>
        </Link>
        <Typography.Text type="secondary" className={styles.phase}>
          Готуємо MVP
        </Typography.Text>
      </Layout.Header>
      <Layout className={styles.mainArea}>
        {!isMobile && <MainSider />}
        <Layout.Content className={styles.content}>
          <Suspense fallback={<Spin size="large" />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
      <Drawer
        title="AP Connect"
        placement="left"
        open={isMobile && isMenuOpen}
        onClose={() => setMenuOpen(false)}
        width={280}
      >
        <MainSider mobile onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </Layout>
  );
}
