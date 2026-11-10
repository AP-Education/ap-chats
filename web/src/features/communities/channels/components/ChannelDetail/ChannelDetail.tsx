import {
  LoadingIcon,
  PageAction,
  PageActionDivider,
  PageActions,
  PageAsideTrigger,
  PageBody,
  PageHeader,
  PageTitle,
  useIsMobile,
} from '@ap-education/ui';
import { CaretDownIcon, GearSixIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { Alert, Button, Dropdown, type MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { callActionLabel } from '@/features/calls/callActionLabel';
import { CallIcon } from '@/features/calls/callIcons';
import { useCallAction } from '@/features/calls/hooks/useCallAction';
import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { useChannelMembership } from '../../../memberships/hooks/useChannelMembership';
import { ChannelNotificationsPopover } from '../../../notifications/components/Popover';
import { PrivateChannelIcon, PublicChannelIcon } from '../../channelIcons';
import { useChannelDialogs } from '../../stores/channel-dialogs-context';
import type { Channel } from '../../types';
import { ReadOnlyChannelFooter } from './ReadOnlyChannelFooter';
import { UnlistedChannelNotice } from './UnlistedChannelNotice';

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

    // Beside the 16px title on a phone the stock 22px glyph reads too slight.
    @media (max-width: ${token.screenMD}px) {
      & > svg:first-child {
        width: 26px;
        height: 26px;
      }
    }
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  leading?: ReactNode;
}

interface ChannelTitleProps {
  channel: Channel;
  canManage: boolean;
  onSettings: () => void;
}

function ChannelTitle({ channel, canManage, onSettings }: ChannelTitleProps) {
  const { t } = useTranslation('communities');
  const { styles } = useStyles();
  const menuItems: MenuProps['items'] = [];
  if (canManage)
    menuItems.push({
      key: 'settings',
      label: t(($) => $.channels.settings),
      icon: <GearSixIcon size={18} />,
    });

  const channelIcon = channel.isOpen ? (
    <PublicChannelIcon size={22} />
  ) : (
    <PrivateChannelIcon size={22} />
  );
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
        },
      }}
      trigger={['click']}
    >
      <button
        type="button"
        className={styles.titleButton}
        aria-label={t(($) => $.channels.actionsOf, { name: channel.name })}
      >
        {title}
      </button>
    </Dropdown>
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
  const { t } = useTranslation('communities');
  const { styles } = useStyles();
  return (
    <div className={styles.sizeNotice}>
      <Alert
        type="info"
        showIcon
        closable
        onClose={onDismiss}
        message={t(($) => $.channels.largeCall.title, { count: memberCount })}
        description={t(($) => $.channels.largeCall.description)}
        action={
          <Button size="small" onClick={onCallAnyway}>
            {t(($) => $.channels.largeCall.callAnyway)}
          </Button>
        }
      />
    </div>
  );
}

export function ChannelDetail({ workspaceId, channel, leading }: ChannelDetailProps) {
  const { t } = useTranslation('communities');
  const { t: callsT } = useTranslation('calls');
  const isMobile = useIsMobile();
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const { query: membersQuery } = useChannelMembership(workspaceId, channel.id);
  const dialogs = useChannelDialogs();
  const [sizeNoticeVisible, setSizeNoticeVisible] = useState(false);
  const canManage = channel.canManage;
  const call = useCallAction(workspaceId, channel.id, channel.name);
  const callTitle = callActionLabel(
    call,
    t(($) => $.channels.callTitle),
    callsT,
  );
  const memberCount = membersQuery.data?.length ?? 0;
  const isLargeChannel = memberCount > LARGE_CHANNEL_MEMBER_THRESHOLD;
  const openSettings = () => dialogs.openSettings(workspaceId, channel.id);

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

  return (
    <>
      <PageHeader>
        {leading}
        <PageTitle>
          <ChannelTitle channel={channel} canManage={canManage} onSettings={openSettings} />
        </PageTitle>
        <PageActions>
          {channel.isMember && (
            <ChannelNotificationsPopover
              key={`${workspaceId}:${channel.id}`}
              workspaceId={workspaceId}
              channelId={channel.id}
              compact={isMobile}
            />
          )}
          <PageAction
            active={call.inCall || call.joinable}
            aria-label={callTitle}
            disabled={call.busy || call.pending || !channel.canPost}
            onClick={handleCall}
          >
            {call.pending ? <LoadingIcon size={22} /> : <CallIcon size={22} />}
          </PageAction>
          <PageActionDivider />
          <PageAsideTrigger aria-label={t(($) => $.channels.members)}>
            <UsersThreeIcon size={22} />
          </PageAsideTrigger>
        </PageActions>
      </PageHeader>
      <PageBody transparent>
        {sizeNoticeVisible && !call.inCall && !call.joinable && (
          <LargeChannelCallNotice
            memberCount={memberCount}
            onCallAnyway={handleCallAnyway}
            onDismiss={() => setSizeNoticeVisible(false)}
          />
        )}
        {channel.isMember ? (
          <ConversationView
            currentMember={currentMember}
            readOnlyFooter={<ReadOnlyChannelFooter />}
          />
        ) : (
          <UnlistedChannelNotice onSettings={openSettings} />
        )}
      </PageBody>
    </>
  );
}
