import { Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { ConversationPane } from '@/domain/conversation/ConversationPane';
import type { CallHistoryFilter } from '@/features/calls/components/CallHistoryList/CallHistoryList';
import { CallHistoryList } from '@/features/calls/components/CallHistoryList/CallHistoryList';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorText};
    font-size: ${token.fontSizeLG}px;
    font-weight: 650;
  `,
  body: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 20px 20px;
  `,
}));

export default function CallsPage() {
  const { styles } = useStyles();
  const { id: workspaceId } = useRequiredWorkspace();
  const [filter, setFilter] = useState<CallHistoryFilter>('all');

  return (
    <ConversationPane
      title={<span className={styles.title}>Дзвінки</span>}
      actions={
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as CallHistoryFilter)}
          options={[
            { label: 'Усі', value: 'all' },
            { label: 'Пропущені', value: 'missed' },
          ]}
        />
      }
    >
      <div className={styles.body}>
        <CallHistoryList workspaceId={workspaceId} filter={filter} />
      </div>
    </ConversationPane>
  );
}
