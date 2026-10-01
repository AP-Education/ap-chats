import { UserMinusIcon } from '@phosphor-icons/react';
import { Button, Empty, Popconfirm, Skeleton, Tooltip } from 'antd';
import { createStyles } from 'antd-style';

import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';
import { MemberLabel } from '@/features/workspaces/components/MemberLabel';
import type { WorkspaceMemberLabel } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import type { ChannelMembership } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  body: css`
    padding: 8px;
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

interface ChannelMembersContentProps {
  isLoading: boolean;
  isError: boolean;
  memberships: ChannelMembership[];
  byId: Map<string, WorkspaceMemberLabel>;
  canManage: boolean;
  onRetry: () => void;
  onRemove: (memberId: string) => void;
}

export function ChannelMembersContent({
  isLoading,
  isError,
  memberships,
  byId,
  canManage,
  onRetry,
  onRemove,
}: ChannelMembersContentProps) {
  const { styles } = useStyles();

  if (isLoading) {
    return (
      <div className={styles.body} role="status" aria-label="Завантажуємо учасників">
        {[0, 1, 2, 3].map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <Skeleton.Avatar active size={40} />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.body} role="alert">
        Не вдалося завантажити учасників.
        <Button type="link" onClick={onRetry}>
          Повторити
        </Button>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className={styles.body}>
        <Empty description="Учасників ще немає" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className={styles.body}>
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
                onConfirm={() => onRemove(membership.memberId)}
              >
                <Tooltip title="Прибрати з каналу">
                  <Button
                    type="text"
                    size="small"
                    className={styles.remove}
                    data-role="remove-member"
                    icon={<UserMinusIcon size={18} />}
                    aria-label={`Прибрати ${entry.label}`}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        );
      })}
    </div>
  );
}
