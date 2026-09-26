import { UserMinusIcon } from '@phosphor-icons/react';
import { Button, Empty, message, Popconfirm, Skeleton, Tooltip } from 'antd';
import { createStyles } from 'antd-style';

import { MemberLabel } from '@/features/workspaces/components/MemberLabel';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { canManageChannel } from '../../../channel-permissions';
import type { Channel } from '../../../channels/types';
import { useChannelMembership } from '../../hooks/useChannelMembership';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    padding: 12px 14px;
  `,
  member: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    min-height: 48px;
    padding: 6px 8px;
    border-radius: ${token.borderRadius}px;
    &:hover {
      background: ${token.colorFillTertiary};
    }
    &:hover [data-role='remove-member'],
    &:focus-within [data-role='remove-member'] {
      opacity: 1;
    }
  `,
  memberLabel: css`
    min-width: 0;
    flex: 1;
  `,
  remove: css`
    opacity: 0;
    @media (hover: none) {
      opacity: 1;
    }
  `,
  skeletonRow: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 6px 8px;
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
  const canManage = canManageChannel(channel, currentMember);

  if (query.isPending || labelsLoading) {
    return (
      <div className={styles.shell} role="status" aria-label="Завантажуємо учасників">
        {[0, 1, 2, 3].map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <Skeleton.Avatar active size={34} />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          </div>
        ))}
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className={styles.shell} role="alert">
        Не вдалося завантажити учасників.
        <Button type="link" onClick={() => void query.refetch()}>
          Повторити
        </Button>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className={styles.shell}>
        <Empty description="Учасників ще немає" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div>
        {memberships.map((membership) => {
          const entry = byId.get(membership.memberId);
          if (!entry) return null;
          return (
            <div className={styles.member} key={membership.memberId}>
              <span className={styles.memberLabel}>
                <MemberLabel entry={entry} size={34} />
              </span>
              {canManage && !entry.isSelf && (
                <Popconfirm
                  title="Прибрати учасника з каналу?"
                  okText="Прибрати"
                  okButtonProps={{ danger: true }}
                  cancelText="Скасувати"
                  onConfirm={() =>
                    remove.mutate(membership.memberId, {
                      onError: () => void message.error('Не вдалося прибрати учасника.'),
                    })
                  }
                >
                  <Tooltip title="Прибрати з каналу">
                    <Button
                      type="text"
                      size="small"
                      className={styles.remove}
                      data-role="remove-member"
                      icon={<UserMinusIcon size={17} />}
                      aria-label={`Прибрати ${entry.label}`}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
