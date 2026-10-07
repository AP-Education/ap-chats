import { PageAsideClose, PageHeader, PageTitle } from '@ap-education/ui';
import { UsersThreeIcon } from '@phosphor-icons/react';
import { message } from 'antd';
import { createStyles } from 'antd-style';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { canManageChannel } from '../../../channel-permissions';
import type { Channel } from '../../../channels/types';
import { useChannelMembership } from '../../hooks/useChannelMembership';
import { ChannelMembersContent } from './ChannelMembersContent';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    min-height: 100%;
  `,
  headingIcon: css`
    color: ${token.colorPrimary};
  `,
  count: css`
    display: inline-grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 11px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextSecondary};
    font-size: 12px;
    font-weight: 650;
  `,
}));

interface ChannelMembersPanelProps {
  workspaceId: string;
  channel: Channel;
}

export function ChannelMembersPanel({ workspaceId, channel }: ChannelMembersPanelProps) {
  const { styles } = useStyles();
  const { byId, currentMember, isLoading: labelsLoading } = useWorkspaceMemberLabels(workspaceId);
  const { query, remove } = useChannelMembership(workspaceId, channel.id);
  const memberships = query.data ?? [];
  const isLoading = query.isPending || labelsLoading;
  const isError = query.isError && !query.data;

  return (
    <div className={styles.shell}>
      <PageHeader>
        <PageTitle>
          <UsersThreeIcon size={20} weight="duotone" className={styles.headingIcon} />
          Учасники
          {!isLoading && !isError && <span className={styles.count}>{memberships.length}</span>}
        </PageTitle>
        <PageAsideClose aria-label="Закрити учасників" />
      </PageHeader>
      <ChannelMembersContent
        isLoading={isLoading}
        isError={isError}
        memberships={memberships}
        byId={byId}
        canManage={canManageChannel(channel, currentMember)}
        onRetry={() => void query.refetch()}
        onRemove={(memberId) =>
          remove.mutate(memberId, {
            onError: () => void message.error('Не вдалося прибрати учасника.'),
          })
        }
      />
    </div>
  );
}
