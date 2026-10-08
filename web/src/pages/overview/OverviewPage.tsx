import { Page, PageBody, PageHeader, PageTitle } from '@ap-education/ui';
import { Empty } from 'antd';
import { createStyles } from 'antd-style';

import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';

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
    <Page>
      <PageHeader>
        <MobileMenuButton />
        <PageTitle>Головна</PageTitle>
      </PageHeader>
      <PageBody>
        <div className={styles.body}>
          <Empty description="Розмов поки немає" />
        </div>
      </PageBody>
    </Page>
  );
}
