import { Page, PageActions, PageBody, PageHeader, PageTitle } from '@ap-education/ui';
import { Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { CallHistoryFilter } from '@/features/calls/components/CallHistoryList/CallHistoryList';
import { CallHistoryList } from '@/features/calls/components/CallHistoryList/CallHistoryList';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';

const useStyles = createStyles(({ token, css }) => ({
  body: css`
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 20px 20px;

    @media (max-width: ${token.screenMD}px) {
      padding: 12px 8px 20px;
    }
  `,
}));

export default function CallsPage() {
  const { styles } = useStyles();
  const { id: workspaceId } = useRequiredWorkspace();
  const [filter, setFilter] = useState<CallHistoryFilter>('all');

  return (
    <Page>
      <PageHeader>
        <MobileMenuButton />
        <PageTitle>Дзвінки</PageTitle>
        <PageActions>
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as CallHistoryFilter)}
            options={[
              { label: 'Усі', value: 'all' },
              { label: 'Пропущені', value: 'missed' },
            ]}
          />
        </PageActions>
      </PageHeader>
      <PageBody>
        <div className={styles.body}>
          <CallHistoryList workspaceId={workspaceId} filter={filter} />
        </div>
      </PageBody>
    </Page>
  );
}
