import { ContentState, ContentStateDescription, ContentStateIcon } from '@ap-education/ui';
import { PhoneIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';

import { useCallHistory } from '../../hooks/useCallHistory';
import { CallHistoryListSkeleton } from './CallHistoryListSkeleton';
import { CallHistoryRow } from './CallHistoryRow';
import { groupCallsByDay } from './groupCallsByDay';

const useStyles = createStyles(({ token, css }) => ({
  error: css`
    padding: 12px 0;
  `,
  group: css`
    &:not(:first-child) {
      margin-top: 20px;
    }
  `,
  groupLabel: css`
    padding: 0 0 8px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    font-weight: 600;
  `,
  empty: css`
    padding: 32px 0;
  `,
}));

export type CallHistoryFilter = 'all' | 'missed';

export function CallHistoryList({
  workspaceId,
  filter,
}: {
  workspaceId: string;
  filter: CallHistoryFilter;
}) {
  const { styles } = useStyles();
  const history = useCallHistory(workspaceId);

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

  const items = history.data.pages.flatMap((page) => page.items);
  const visible =
    filter === 'missed'
      ? items.filter((item) => item.status === 'missed' || item.status === 'declined')
      : items;
  const groups = groupCallsByDay(visible);

  if (groups.length === 0)
    return (
      <div className={styles.empty}>
        <ContentState compact>
          <ContentStateIcon>
            <PhoneIcon />
          </ContentStateIcon>
          <ContentStateDescription>
            {filter === 'missed' ? 'Пропущених дзвінків немає' : 'Дзвінків поки немає'}
          </ContentStateDescription>
        </ContentState>
      </div>
    );

  return (
    <div>
      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          {group.items.map((item) => (
            <CallHistoryRow key={item.id} item={item} workspaceId={workspaceId} />
          ))}
        </div>
      ))}
      {history.hasNextPage && (
        <Button
          block
          loading={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          Показати ще
        </Button>
      )}
    </div>
  );
}
