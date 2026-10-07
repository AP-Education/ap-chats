import { CaretDownIcon, GearSixIcon, SignOutIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { Alert, Button, Dropdown, type MenuProps, message } from 'antd';
import { createStyles } from 'antd-style';
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ConversationActionDivider,
  ConversationPane,
} from '@/domain/conversation/ConversationPane';
import { callActionLabel } from '@/features/calls/callActionLabel';
import { CallIcon } from '@/features/calls/callIcons';
import { useCallAction } from '@/features/calls/hooks/useCallAction';
import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { ApiError } from '@/shared/api/http';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';
import { LoadingIcon } from '@/shared/ui/LoadingIcon/LoadingIcon';

import { canManageChannel } from '../../../channel-permissions';
import { useChannelMembership } from '../../../memberships/hooks/useChannelMembership';
import { ChannelNotificationsPopover } from '../../../notifications/components/Popover';
import { PrivateChannelIcon, PublicChannelIcon } from '../../channelIcons';
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
    pointer-events: auto;

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
  sizeNotice: css`
    flex-shrink: 0;
    padding: 10px 20px 0;

    @media (max-width: ${token.screenMD}px) {
      padding: 8px 12px 0;
    }
  `,
}));

// A plain call rings every member at once; past this size a scheduled
// meeting (an agenda, no surprise ring) tends to fit better, so the header's
// call button pauses here to say so once instead of launching straight in.
const LARGE_CHANNEL_MEMBER_THRESHOLD = 5;

interface ChannelDetailProps {
  workspaceId: string;
  channel: Channel;
  membersVisible: boolean;
  onToggleMembers: () => void;
  leading?: ReactNode;
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
      icon: <GearSixIcon size={18} />,
    });
  if (channel.isMember)
    menuItems.push({
      key: 'leave',
      label: 'Вийти з каналу',
      icon: <SignOutIcon size={18} />,
      danger: true,
    });

  const channelIcon =
    channel.kind === 'private' ? <PrivateChannelIcon size={22} /> : <PublicChannelIcon size={22} />;
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

interface LargeChannelCallNoticeProps {
  memberCount: number;
  onCallAnyway: () => void;
  onDismiss: () => void;
}

function LargeChannelCallNotice({
  memberCount,
  onCallAnyway,
  onDismiss,
}: LargeChannelCallNoticeProps) {
  const { styles } = useStyles();
  return (
    <div className={styles.sizeNotice}>
      <Alert
        type="info"
        showIcon
        closable
        onClose={onDismiss}
        message={`У цьому каналі ${memberCount} учасників`}
        description="Дзвінок краще підходить для невеликих груп. Для такої кількості людей, можливо, зручніше запланувати окрему зустріч."
        action={
          <Button size="small" onClick={onCallAnyway}>
            Подзвонити
          </Button>
        }
      />
    </div>
  );
}

export function ChannelDetail({
  workspaceId,
  channel,
  membersVisible,
  onToggleMembers,
  leading,
}: ChannelDetailProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const { query: membersQuery, join, leave } = useChannelMembership(workspaceId, channel.id);
  const [editing, setEditing] = useState(false);
  const [sizeNoticeVisible, setSizeNoticeVisible] = useState(false);
  const canManage = canManageChannel(channel, currentMember);
  const actionSize = isMobile ? 40 : 36;
  const call = useCallAction(workspaceId, channel.id, channel.name);
  const callTitle = callActionLabel(call, 'Дзвінок у каналі');
  const memberCount = membersQuery.data?.length ?? 0;
  const isLargeChannel = memberCount > LARGE_CHANNEL_MEMBER_THRESHOLD;

  function handleCall() {
    // Only pause for a call about to start fresh: joining one already
    // ringing, or getting back to your own minimized call, needs no warning.
    const startingFresh = !call.inCall && !call.joinable && !call.busy;
    if (startingFresh && isLargeChannel) {
      setSizeNoticeVisible(true);
      return;
    }
    call.onClick();
  }

  function handleCallAnyway() {
    setSizeNoticeVisible(false);
    call.onClick();
  }

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
      title={
        <>
          {leading}
          <ChannelTitle
            channel={channel}
            canManage={canManage}
            onSettings={() => setEditing(true)}
            onLeave={handleLeave}
          />
        </>
      }
      actions={
        <>
          {channel.isMember && (
            <ChannelNotificationsPopover
              key={`${workspaceId}:${channel.id}`}
              workspaceId={workspaceId}
              channelId={channel.id}
              compact={isMobile}
            />
          )}
          <IconButton
            size={actionSize}
            className={cx(
              styles.headerAction,
              (call.inCall || call.joinable) && styles.actionActive,
            )}
            aria-label={callTitle}
            disabled={call.busy || call.pending || !channel.isMember}
            onClick={handleCall}
          >
            {call.pending ? <LoadingIcon size={22} /> : <CallIcon size={22} />}
          </IconButton>
          <ConversationActionDivider />
          <IconButton
            size={actionSize}
            className={cx(styles.headerAction, membersVisible && styles.actionActive)}
            aria-label={membersVisible ? 'Сховати учасників' : 'Показати учасників'}
            aria-pressed={membersVisible}
            onClick={onToggleMembers}
          >
            <UsersThreeIcon size={22} />
          </IconButton>
        </>
      }
    >
      {sizeNoticeVisible && !call.inCall && !call.joinable && (
        <LargeChannelCallNotice
          memberCount={memberCount}
          onCallAnyway={handleCallAnyway}
          onDismiss={() => setSizeNoticeVisible(false)}
        />
      )}
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
