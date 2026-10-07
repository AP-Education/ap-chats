import { IconButton, useIsMobile } from '@ap/ui';
import { GearSixIcon, PlusIcon } from '@phosphor-icons/react';
import { Button, message } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { getLastConversation } from '@/features/social/conversation/lastConversation';
import { useWorkspaceUnreadStore } from '@/features/social/read-state/workspace-unread-context';

import { ChannelCategoriesModal } from '../../channel-categories/components/ChannelCategoriesModal';
import { ChannelFormModal } from '../../channels/components/ChannelFormModal';
import { useChannelActions } from '../../channels/hooks/useChannelActions';
import type { Channel } from '../../channels/types';
import { CategoryQuickCreate } from './CategoryQuickCreate';
import { ChannelsSidebarContext, type CreateChannelTarget } from './channels-sidebar-context';
import { ChannelSectionView } from './ChannelSectionView';
import { ChannelsSidebarLoading } from './ChannelsSidebarLoading';
import { useChannelSections } from './useChannelSections';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    padding-bottom: 8px;
  `,
  actions: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 16px 10px;
    min-height: 44px;
    border-top: 1px solid ${token.colorBorderSecondary};

    @media (max-width: ${token.screenMD}px) {
      padding-inline: 8px;
    }
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 2px;
  `,
}));

interface ChannelsListProps {
  workspaceId: string;
  onNavigate?: () => void;
}

export function ChannelsList({ workspaceId, onNavigate }: ChannelsListProps) {
  const { styles } = useStyles();
  const { isLoading, isError, retry, isOwner, currentMember, sections, createCategory } =
    useChannelSections(workspaceId);
  const { update } = useChannelActions(workspaceId);
  const { unreadByChannel } = useWorkspaceUnreadStore();
  const { identity } = useQueryAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const routedChannelId = matchPath('/channels/:channelId', location.pathname)?.params.channelId;
  const selectedChannelId =
    routedChannelId ??
    (isMobile ? (getLastConversation(identity, workspaceId, 'channels') ?? undefined) : undefined);

  const [creatingChannel, setCreatingChannel] = useState<CreateChannelTarget | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [draggingChannel, setDraggingChannel] = useState<Channel | null>(null);

  function moveChannel(channel: Channel, categoryId: string | null) {
    if (channel.categoryId === categoryId) return;
    update.mutate(
      { channelId: channel.id, input: { categoryId } },
      { onError: () => message.error('Не вдалося перенести канал.') },
    );
    setDraggingChannel(null);
  }

  if (isLoading) return <ChannelsSidebarLoading />;

  if (isError) {
    return (
      <div role="alert" style={{ padding: '12px 16px' }}>
        Не вдалося завантажити канали.{' '}
        <Button type="link" onClick={retry}>
          Повторити
        </Button>
      </div>
    );
  }

  const sidebarStore = {
    workspaceId,
    currentMember,
    selectedChannelId,
    openChannelId: routedChannelId,
    unreadByChannel,
    onNavigate,
    requestCreateChannel: setCreatingChannel,
    draggingChannel,
    setDraggingChannel,
    moveChannel,
  };

  return (
    <div className={styles.root}>
      <ChannelsSidebarContext.Provider value={sidebarStore}>
        {sections.map((section) => (
          <ChannelSectionView key={section.id} section={section} />
        ))}
      </ChannelsSidebarContext.Provider>

      {isOwner && (
        <div className={styles.actions}>
          <div className={styles.headerActions}>
            <IconButton
              size={isMobile ? 36 : 28}
              aria-label="Створити канал"
              onClick={() => setCreatingChannel({ categoryName: 'Без категорії' })}
            >
              <PlusIcon size={20} />
            </IconButton>
            <CategoryQuickCreate
              isPending={createCategory.isPending}
              onCreate={(name) => createCategory.mutateAsync({ name })}
            />
            <IconButton
              size={isMobile ? 36 : 28}
              aria-label="Керувати категоріями"
              onClick={() => setManagingCategories(true)}
            >
              <GearSixIcon size={18} />
            </IconButton>
          </div>
        </div>
      )}

      <ChannelFormModal
        workspaceId={workspaceId}
        open={creatingChannel !== null}
        categoryId={creatingChannel?.categoryId}
        categoryName={creatingChannel?.categoryName ?? 'Без категорії'}
        onClose={() => setCreatingChannel(null)}
      />
      {isOwner && (
        <ChannelCategoriesModal
          workspaceId={workspaceId}
          open={managingCategories}
          onClose={() => setManagingCategories(false)}
        />
      )}
    </div>
  );
}
