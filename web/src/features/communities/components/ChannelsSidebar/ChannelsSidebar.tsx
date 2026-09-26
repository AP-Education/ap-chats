import { GearSixIcon } from '@phosphor-icons/react';
import { message, Spin, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { IconButton } from '@/shared/ui/IconButton';

import { ChannelCategoriesModal } from '../../channel-categories/components/ChannelCategoriesModal';
import { ChannelFormModal } from '../../channels/components/ChannelFormModal';
import { useChannelActions } from '../../channels/hooks/useChannelActions';
import type { Channel } from '../../channels/types';
import { CategoryQuickCreate } from './CategoryQuickCreate';
import { ChannelsSidebarContext, type CreateChannelTarget } from './channels-sidebar-context';
import { ChannelSectionView } from './ChannelSectionView';
import { useChannelSections } from './useChannelSections';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    padding-bottom: 8px;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 16px 6px;

    @media (max-width: ${token.screenMD}px) {
      padding-inline: 8px;
    }
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 2px;
  `,
  loading: css`
    display: flex;
    padding: ${token.paddingSM}px 16px;
  `,
}));

interface ChannelsSidebarProps {
  onNavigate?: () => void;
}

// Lives permanently in MainSider (below the DMs/Calls/General nav), scoped to
// whichever workspace is active. Owns only composition and modal state; the
// section/channel data comes from useChannelSections, and each section's own
// markup comes from ChannelSectionView. selectedChannelId/onNavigate/
// requestCreateChannel are shared with that subtree via context instead of
// being threaded through every section and row as props.
export function ChannelsSidebar({ onNavigate }: ChannelsSidebarProps) {
  const { styles } = useStyles();
  const { workspaceId, isLoading, isOwner, currentMember, sections, createCategory } =
    useChannelSections();
  const { update } = useChannelActions(workspaceId ?? '');
  const location = useLocation();
  const selectedChannelId = matchPath('/channels/:channelId', location.pathname)?.params.channelId;

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
  const sidebarStore = {
    workspaceId: workspaceId ?? '',
    currentMember,
    selectedChannelId,
    onNavigate,
    requestCreateChannel: setCreatingChannel,
    draggingChannel,
    setDraggingChannel,
    moveChannel,
  };

  if (!workspaceId) return null;

  return (
    <div className={styles.root}>
      {isOwner && (
        <div className={styles.header}>
          <div className={styles.headerActions}>
            <CategoryQuickCreate
              isPending={createCategory.isPending}
              onCreate={(name) => createCategory.mutate({ name })}
            />
            <Tooltip title="Керувати категоріями">
              <IconButton
                size={28}
                aria-label="Керувати категоріями"
                onClick={() => setManagingCategories(true)}
              >
                <GearSixIcon size={16} />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spin size="small" />
        </div>
      ) : (
        <ChannelsSidebarContext.Provider value={sidebarStore}>
          {sections.map((section) => (
            <ChannelSectionView key={section.id} section={section} />
          ))}
        </ChannelsSidebarContext.Provider>
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
