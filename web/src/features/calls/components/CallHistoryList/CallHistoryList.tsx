import { Button, Empty, Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { useCallHistory } from '../../hooks/useCallHistory';
import type { CallHistoryFilter } from '../../types';
import { CallHistoryListSkeleton } from './CallHistoryListSkeleton';
import { type CallEntryLinkState, CallHistoryRow } from './CallHistoryRow';
import { groupCallHistory } from './groupCallHistory';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: ${token.colorBgContainer};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px 8px 16px;

    @media (max-width: ${token.screenMD}px) {
      min-height: 44px;
      padding: 6px 12px 4px;
    }
  `,
  title: css`
    font-weight: 650;
  `,
  list: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `,
  error: css`
    padding: 12px;
  `,
  empty: css`
    padding: 24px 12px;
  `,
  more: css`
    padding: 8px 12px 12px;
  `,
}));

export function CallHistoryList({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const { styles } = useStyles();
  const [filter, setFilter] = useState<CallHistoryFilter>('all');

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Дзвінки</span>
        <Segmented
          size="small"
          value={filter}
          onChange={(value) => setFilter(value as CallHistoryFilter)}
          options={[
            { label: 'Усі', value: 'all' },
            { label: 'Пропущені', value: 'missed' },
          ]}
        />
      </div>
      <div className={styles.list}>
        <CallHistoryResults workspaceId={workspaceId} filter={filter} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function CallHistoryResults({
  workspaceId,
  filter,
  onNavigate,
}: {
  workspaceId: string;
  filter: CallHistoryFilter;
  onNavigate?: () => void;
}) {
  const { styles } = useStyles();
  const location = useLocation();
  const history = useCallHistory(workspaceId, filter);

  if (history.isPending) return <CallHistoryListSkeleton />;
  if (history.isError && !history.data)
    return (
      <div role="alert" className={styles.error}>
        Не вдалося завантажити дзвінки.{' '}
        <Button type="link" onClick={() => void history.refetch()}>
          Повторити
        </Button>
      </div>
    );

  const entries = groupCallHistory(history.data.pages.flatMap((page) => page.items));

  if (entries.length === 0)
    return (
      <Empty
        className={styles.empty}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={filter === 'missed' ? 'Пропущених дзвінків немає' : 'Дзвінків поки немає'}
      />
    );

  const openChannelId = matchPath('/direct/:channelId', location.pathname)?.params.channelId;
  const openEntries = entries.filter((entry) => entry.latest.channelId === openChannelId);
  const clickedKey = (location.state as CallEntryLinkState | null)?.callEntry;
  const activeKey = (openEntries.find((entry) => entry.key === clickedKey) ?? openEntries[0])?.key;

  return (
    <>
      {entries.map((entry) => (
        <CallHistoryRow
          key={entry.key}
          entry={entry}
          workspaceId={workspaceId}
          active={entry.key === activeKey}
          onNavigate={onNavigate}
        />
      ))}
      {history.hasNextPage && (
        <div className={styles.more}>
          <Button
            block
            loading={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            Показати ще
          </Button>
        </div>
      )}
    </>
  );
}
