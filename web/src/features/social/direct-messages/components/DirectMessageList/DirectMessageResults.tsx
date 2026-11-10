import {
  ContentState,
  ContentStateActions,
  ContentStateDescription,
  ContentStateIcon,
} from '@ap-education/ui';
import { ChatTextIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';

import { QUIET } from '@/features/social/read-state/conversation-attention';
import { useWorkspaceUnreadStore } from '@/features/social/read-state/workspace-unread-context';

import { useDirectMessages } from '../../hooks/useDirectMessages';
import { DirectMessageListSkeleton } from './DirectMessageListSkeleton';
import { DirectMessageRow } from './DirectMessageRow';

const useStyles = createStyles(({ css }) => ({
  error: css`
    padding: 12px 16px;
  `,
}));

export function DirectMessageResults({
  onCompose,
  onNavigate,
}: {
  onCompose: () => void;
  onNavigate?: () => void;
}) {
  const { styles } = useStyles();
  const conversations = useDirectMessages();
  const { attentionByChannel } = useWorkspaceUnreadStore();

  if (conversations.isPending) return <DirectMessageListSkeleton />;
  if (conversations.isError && !conversations.data)
    return (
      <div role="alert" className={styles.error}>
        Не вдалося завантажити розмови.{' '}
        <Button type="link" onClick={() => void conversations.refetch()}>
          Повторити
        </Button>
      </div>
    );

  const items = conversations.data.pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return (
      <ContentState compact>
        <ContentStateIcon>
          <ChatTextIcon />
        </ContentStateIcon>
        <ContentStateDescription>Поки немає розмов</ContentStateDescription>
        <ContentStateActions>
          <Button onClick={onCompose}>Написати колезі</Button>
        </ContentStateActions>
      </ContentState>
    );
  }
  return (
    <>
      {items.map((item) => (
        <DirectMessageRow
          key={item.id}
          item={item}
          attention={attentionByChannel.get(item.id) ?? QUIET}
          onNavigate={onNavigate}
        />
      ))}
      {conversations.hasNextPage && (
        <Button
          block
          loading={conversations.isFetchingNextPage}
          onClick={() => void conversations.fetchNextPage()}
        >
          Показати ще
        </Button>
      )}
    </>
  );
}
