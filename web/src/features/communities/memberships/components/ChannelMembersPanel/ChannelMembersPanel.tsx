import { PageAsideClose, PageHeader, PageTitle } from '@ap-education/ui';
import { UsersThreeIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { useRoles } from '@/features/roles/hooks/useRoles';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import type { Channel } from '../../../channels/types';
import { useChannelMembership } from '../../hooks/useChannelMembership';
import { groupMembersByRole } from '../../member-groups';
import { ChannelMembersContent } from './ChannelMembersContent';

const useStyles = createStyles(({ token, css }) => ({
  // Only the list scrolls, so the heading and its close stay in view over a long channel.
  shell: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
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
  const { t } = useTranslation('communities');
  const { styles } = useStyles();
  const { byId, isLoading: labelsLoading } = useWorkspaceMemberLabels(workspaceId);
  const { query } = useChannelMembership(workspaceId, channel.id);
  const { query: roles } = useRoles(workspaceId);
  const memberships = query.data ?? [];
  const groups = groupMembersByRole(
    memberships,
    roles.data ?? [],
    (memberId) => byId.get(memberId)?.label ?? '',
    t,
  );
  const isLoading = query.isPending || labelsLoading;
  const isError = query.isError && !query.data;

  return (
    <div className={styles.shell}>
      <PageHeader>
        <PageTitle>
          <UsersThreeIcon size={20} weight="duotone" className={styles.headingIcon} />
          {t(($) => $.members.title)}
          {!isLoading && !isError && <span className={styles.count}>{memberships.length}</span>}
        </PageTitle>
        <PageAsideClose aria-label={t(($) => $.members.close)} />
      </PageHeader>
      <ChannelMembersContent
        isLoading={isLoading}
        isError={isError}
        groups={groups}
        byId={byId}
        onRetry={() => void query.refetch()}
      />
    </div>
  );
}
