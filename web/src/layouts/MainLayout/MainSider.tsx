import { Layout } from 'antd';

import { MainSiderMenu } from './MainSiderMenu';
import { useMainLayoutStyles } from './useMainLayoutStyles';

export function MainSider() {
  const { styles } = useMainLayoutStyles();

  return (
    <Layout.Sider
      className={styles.sidebar}
      theme="light"
      width={290}
      style={{ width: 290, minWidth: 290, height: '100%', overflow: 'hidden' }}
    >
      <MainSiderMenu />
    </Layout.Sider>
  );
}
