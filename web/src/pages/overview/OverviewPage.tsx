import { Empty } from 'antd';
import { createStyles } from 'antd-style';

import { ConversationPane } from '@/domain/conversation/ConversationPane';
import { MobileMenuButton } from '@/layouts/MainLayout/MobileMenuButton';

const useStyles = createStyles(({ css }) => ({
  body: css`
    flex: 1;
    display: grid;
    place-items: center;
    min-height: 0;
    padding: 16px;
  `,
}));

export default function OverviewPage() {
  const { styles } = useStyles();

  return (
    <ConversationPane
      title={
        <>
          <MobileMenuButton />
          Головна
        </>
      }
    >
      <div className={styles.body}>
        <Empty description="Розмов поки немає" />
      </div>
    </ConversationPane>
  );
}
