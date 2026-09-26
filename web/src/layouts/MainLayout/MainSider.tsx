import { Layout } from 'antd';

import { MainSiderMenu } from './MainSiderMenu';
import { useMainLayoutStyles } from './useMainLayoutStyles';

export function MainSider() {
  const { styles } = useMainLayoutStyles();

  return (
    <Layout.Sider
      className={styles.sidebar}
      theme="light"
      width={264}
      style={{ width: 264, minWidth: 264, height: '100%', overflow: 'hidden' }}
    >
      <MainSiderMenu />
    </Layout.Sider>
  );
}
