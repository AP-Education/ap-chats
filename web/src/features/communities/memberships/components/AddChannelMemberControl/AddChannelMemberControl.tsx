import { UserPlusIcon } from '@phosphor-icons/react';
import { Button, message, Select } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import type { Channel } from '../../../channels/types';
import { useChannelMembership } from '../../hooks/useChannelMembership';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    gap: ${token.marginXS}px;
  `,
}));

interface AddChannelMemberControlProps {
  workspaceId: string;
  channel: Channel;
  size?: 'small' | 'middle';
  className?: string;
}

// A workspace-member picker that adds the pick to this channel. Shared by
// ChannelMembersPanel's aside and the sidebar's per-channel "add people"
// popover — same rule (any current channel member may add) and mutation.
export function AddChannelMemberControl({
  workspaceId,
  channel,
  size = 'small',
  className,
}: AddChannelMemberControlProps) {
  const { styles, cx } = useStyles();
  const { byId } = useWorkspaceMemberLabels(workspaceId);
  const { query, add } = useChannelMembership(workspaceId, channel.id);
  const [addingMemberId, setAddingMemberId] = useState<string>();

  const canAdd = channel.isMember;
  if (!canAdd) return null;

  const memberships = query.data ?? [];
  const memberIds = new Set(memberships.map((membership) => membership.memberId));
  const candidateOptions = [...byId.values()]
    .filter((entry) => !memberIds.has(entry.member.id))
    .map((entry) => ({ label: entry.label, value: entry.member.id }));

  function handleAdd() {
    if (!addingMemberId) return;
    add.mutate(addingMemberId, {
      onSuccess: () => setAddingMemberId(undefined),
      onError: () => void message.error('Не вдалося додати учасника.'),
    });
  }

  return (
    <div className={cx(styles.row, className)}>
      <Select
        style={{ flex: 1 }}
        size={size}
        placeholder="Додати учасника"
        showSearch
        optionFilterProp="label"
        value={addingMemberId}
        options={candidateOptions}
        onChange={setAddingMemberId}
      />
      <Button
        type="primary"
        size={size}
        icon={<UserPlusIcon size={14} />}
        disabled={!addingMemberId}
        loading={add.isPending}
        aria-label="Додати учасника"
        onClick={handleAdd}
      />
    </div>
  );
}
