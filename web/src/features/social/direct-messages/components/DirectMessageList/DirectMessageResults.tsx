import {
  ContentState,
  ContentStateActions,
  ContentStateDescription,
  ContentStateIcon,
} from '@ap-education/ui';
import { ChatTextIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { useWorkspaceUnreadStore } from '@/features/social/read-state/workspace-unread-context';

import { useDirectMessages } from '../../hooks/useDirectMessages';
import { DirectMessageListSkeleton } from './DirectMessageListSkeleton';
import { DirectMessageRow } from './DirectMessageRow';
import { PeopleSearchResults } from './PeopleSearchResults';

const useStyles = createStyles(({ token, css }) => ({
  error: css`
    padding: 12px 16px;
  `,
  heading: css`
    padding: 12px 16px 4px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    font-weight: 600;
  `,
}));

export function DirectMessageResults({
  workspaceId,
  filter,
  onCompose,
  onNavigate,
}: {
  workspaceId: string;
  filter: string;
  onCompose: () => void;
  onNavigate?: () => void;
}) {
  const { styles } = useStyles();
  const { t } = useTranslation(['directMessages', 'common']);
  const conversations = useDirectMessages();
  const { unreadByChannel } = useWorkspaceUnreadStore();

  if (conversations.isPending) return <DirectMessageListSkeleton />;
  if (conversations.isError && !conversations.data)
    return (
      <div role="alert" className={styles.error}>
        {t(($) => $.list.loadFailed)}{' '}
        <Button type="link" onClick={() => void conversations.refetch()}>
          {t(($) => $.common.actions.retry)}
        </Button>
      </div>
    );

  const items = conversations.data.pages.flatMap((page) => page.items);
  const visible = items.filter((item) =>
    (item.participant.displayName ?? '').toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
  );
  if (visible.length === 0 && !filter.trim()) {
    return (
      <ContentState compact>
        <ContentStateIcon>
          <ChatTextIcon />
        </ContentStateIcon>
        <ContentStateDescription>
          {filter ? t(($) => $.list.notFound) : t(($) => $.list.empty)}
        </ContentStateDescription>
        <ContentStateActions>
          <Button onClick={onCompose}>{t(($) => $.list.compose)}</Button>
        </ContentStateActions>
      </ContentState>
    );
  }
  return (
    <>
      {filter.trim() && visible.length > 0 && (
        <div className={styles.heading}>{t(($) => $.list.title)}</div>
      )}
      {visible.map((item) => (
        <DirectMessageRow
          key={item.id}
          item={item}
          unreadCount={unreadByChannel.get(item.id) ?? 0}
          onNavigate={onNavigate}
        />
      ))}
      {conversations.hasNextPage && (
        <Button
          block
          loading={conversations.isFetchingNextPage}
          onClick={() => void conversations.fetchNextPage()}
        >
          {t(($) => $.list.showMore)}
        </Button>
      )}
      {filter.trim() && (
        <PeopleSearchResults
          workspaceId={workspaceId}
          query={filter}
          excludedMemberIds={new Set(items.map((item) => item.participant.memberId))}
          showEmpty={visible.length === 0}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
