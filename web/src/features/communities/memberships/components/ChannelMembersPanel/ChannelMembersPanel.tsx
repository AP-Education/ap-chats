import { UserMinusIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { Button, Empty, message, Popconfirm, Skeleton, Tooltip } from 'antd';
import { createStyles } from 'antd-style';

import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';
import { MemberLabel } from '@/features/workspaces/components/MemberLabel';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { canManageChannel } from '../../../channel-permissions';
import type { Channel } from '../../../channels/types';
import { useChannelMembership } from '../../hooks/useChannelMembership';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    padding: 22px 12px;
  `,
  heading: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px 14px;
    color: ${token.colorText};
    font-size: 16px;
    font-weight: 650;
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
  member: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-height: 58px;
    padding: 7px 10px;
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
  memberTrigger: css`
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 3px;
      border-radius: ${token.borderRadius}px;
    }
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
    height: 58px;
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
            <Skeleton.Avatar active size={40} />
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
      <div className={styles.heading}>
        <UsersThreeIcon size={20} weight="duotone" className={styles.headingIcon} />
        Учасники <span className={styles.count}>{memberships.length}</span>
      </div>
      <div>
        {memberships.map((membership) => {
          const entry = byId.get(membership.memberId);
          if (!entry) return null;
          return (
            <div className={styles.member} key={membership.memberId}>
              <span className={styles.memberLabel}>
                <MemberPopover
                  member={{
                    memberId: entry.member.id,
                    displayName: entry.member.profile.displayName,
                    avatarPath: entry.member.profile.avatarPath,
                  }}
                >
                  <button type="button" className={styles.memberTrigger}>
                    <MemberLabel entry={entry} size={40} />
                  </button>
                </MemberPopover>
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
