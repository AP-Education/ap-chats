import { LoadingOutlined } from '@ant-design/icons';
import {
  CaretDownIcon,
  GearSixIcon,
  HashIcon,
  LockSimpleIcon,
  PhoneIcon,
  SignOutIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { Button, Dropdown, type MenuProps, message, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ConversationActionDivider,
  ConversationPane,
} from '@/domain/conversation/ConversationPane';
import { callActionLabel } from '@/features/calls/callActionLabel';
import { useCallAction } from '@/features/calls/hooks/useCallAction';
import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { ApiError } from '@/shared/api/http';
import { IconButton } from '@/shared/ui/IconButton';

import { canManageChannel } from '../../../channel-permissions';
import { useChannelMembership } from '../../../memberships/hooks/useChannelMembership';
import { ChannelNotificationsPopover } from '../../../notifications/components/Popover';
import type { Channel } from '../../types';
import { ChannelFormModal } from '../ChannelFormModal';

const useStyles = createStyles(({ token, css }) => ({
  titleButton: css`
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    max-width: 100%;
    padding: 7px 8px;
    margin-left: -8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    cursor: pointer;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeLG}px;
    font-weight: 650;
  `,
  headerAction: css`
    color: ${token.colorTextSecondary};
  `,
  actionActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  joinFooter: css`
    flex-shrink: 0;
    padding: 0 ${token.paddingLG}px ${token.paddingSM}px;

    @media (max-width: ${token.screenMD}px) {
      padding: 0 16px calc(8px + env(safe-area-inset-bottom, 0px));
    }
  `,
  joinSurface: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 58px;
    padding: 8px 10px 8px 18px;
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: 12px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorTextSecondary};

    @media (max-width: ${token.screenMD}px) {
      gap: 8px;
      padding-left: 12px;
    }
  `,
  joinHint: css`
    min-width: 0;
    font-size: ${token.fontSize}px;
  `,
  joinButton: css`
    flex-shrink: 0;
  `,
}));

interface ChannelDetailProps {
  workspaceId: string;
  channel: Channel;
  membersVisible: boolean;
  onToggleMembers: () => void;
  onBack?: () => void;
}

interface ChannelTitleProps {
  channel: Channel;
  canManage: boolean;
  onSettings: () => void;
  onLeave: () => void;
}

function ChannelTitle({ channel, canManage, onSettings, onLeave }: ChannelTitleProps) {
  const { styles } = useStyles();
  const menuItems: MenuProps['items'] = [];
  if (canManage)
    menuItems.push({
      key: 'settings',
      label: 'Налаштування каналу',
      icon: <GearSixIcon size={17} />,
    });
  if (channel.isMember)
    menuItems.push({
      key: 'leave',
      label: 'Вийти з каналу',
      icon: <SignOutIcon size={17} />,
      danger: true,
    });

  const channelIcon =
    channel.kind === 'private' ? <LockSimpleIcon size={21} /> : <HashIcon size={21} />;
  const title = (
    <>
      {channelIcon}
      <span className={styles.name}>{channel.name}</span>
      {menuItems.length > 0 && <CaretDownIcon size={14} />}
    </>
  );

  if (!menuItems.length) return <div className={styles.titleButton}>{title}</div>;

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: ({ key }) => {
          if (key === 'settings') onSettings();
          if (key === 'leave') onLeave();
        },
      }}
      trigger={['click']}
    >
      <button
        type="button"
        className={styles.titleButton}
        aria-label={`Дії каналу ${channel.name}`}
      >
        {title}
      </button>
    </Dropdown>
  );
}

interface JoinChannelFooterProps {
  channel: Channel;
  pending: boolean;
  onJoin: () => void;
}

function JoinChannelFooter({ channel, pending, onJoin }: JoinChannelFooterProps) {
  const { styles } = useStyles();
  if (channel.isMember || channel.kind !== 'public') return null;

  return (
    <div className={styles.joinFooter}>
      <div className={styles.joinSurface}>
        <span className={styles.joinHint}>Приєднайтеся до каналу, щоб написати повідомлення</span>
        <Button type="primary" className={styles.joinButton} loading={pending} onClick={onJoin}>
          Приєднатися
        </Button>
      </div>
    </div>
  );
}

export function ChannelDetail({
  workspaceId,
  channel,
  membersVisible,
  onToggleMembers,
  onBack,
}: ChannelDetailProps) {
  const { styles, cx } = useStyles();
  const navigate = useNavigate();
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const { join, leave } = useChannelMembership(workspaceId, channel.id);
  const [editing, setEditing] = useState(false);
  const canManage = canManageChannel(channel, currentMember);
  const actionSize = onBack ? 40 : 36;
  const call = useCallAction(workspaceId, channel.id, channel.name);
  const callTitle = callActionLabel(call, 'Дзвінок у каналі');

  function handleJoin() {
    join.mutate(undefined, {
      onError: () => message.error('Не вдалося приєднатися до каналу.'),
    });
  }

  function handleLeave() {
    leave.mutate(undefined, {
      onSuccess: () => navigate('/channels'),
      onError: (error) =>
        message.error(
          error instanceof ApiError && error.status === 409
            ? 'Ви єдиний учасник приватного каналу. Спершу додайте когось іншого.'
            : 'Не вдалося вийти з каналу.',
        ),
    });
  }

  return (
    <ConversationPane
      onBack={onBack}
      backLabel="Назад до каналів"
      title={
        <ChannelTitle
          channel={channel}
          canManage={canManage}
          onSettings={() => setEditing(true)}
          onLeave={handleLeave}
        />
      }
      actions={
        <>
          {channel.isMember && (
            <ChannelNotificationsPopover
              key={`${workspaceId}:${channel.id}`}
              workspaceId={workspaceId}
              channelId={channel.id}
              compact={Boolean(onBack)}
            />
          )}
          <Tooltip title={callTitle}>
            <span>
              <IconButton
                size={actionSize}
                className={cx(
                  styles.headerAction,
                  (call.inCall || call.joinable) && styles.actionActive,
                )}
                aria-label={callTitle}
                disabled={call.busy || call.pending || !channel.isMember}
                onClick={call.onClick}
              >
                {call.pending ? (
                  <LoadingOutlined />
                ) : (
                  <PhoneIcon size={21} weight={call.joinable ? 'fill' : 'regular'} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <ConversationActionDivider />
          <Tooltip title={membersVisible ? 'Сховати учасників' : 'Показати учасників'}>
            <IconButton
              size={actionSize}
              className={cx(styles.headerAction, membersVisible && styles.actionActive)}
              aria-label={membersVisible ? 'Сховати учасників' : 'Показати учасників'}
              aria-pressed={membersVisible}
              onClick={onToggleMembers}
            >
              <UsersThreeIcon size={22} weight={membersVisible ? 'duotone' : 'regular'} />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <ConversationView
        canPost={channel.isMember}
        canManage={canManage}
        currentMember={currentMember}
        readOnlyFooter={
          <JoinChannelFooter channel={channel} pending={join.isPending} onJoin={handleJoin} />
        }
      />
      {canManage && (
        <ChannelFormModal
          workspaceId={workspaceId}
          channel={channel}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </ConversationPane>
  );
}
