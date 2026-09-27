import {
  ArrowLeftIcon,
  CaretDownIcon,
  GearSixIcon,
  HashIcon,
  LockSimpleIcon,
  PhoneIcon,
  PushPinIcon,
  SignOutIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { Button, Dropdown, message, Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import { PinnedMessages } from '@/features/social/pins/components/PinnedMessages/PinnedMessages';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { ApiError } from '@/shared/api/http';
import { IconButton } from '@/shared/ui/IconButton';

import { canManageChannel } from '../../../channel-permissions';
import { useChannelMembership } from '../../../memberships/hooks/useChannelMembership';
import { ChannelNotificationsPopover } from '../../../notifications/components/Popover';
import type { Channel } from '../../types';
import { ChannelFormModal } from '../ChannelFormModal';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 60px;
    padding: 0 20px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    @media (max-width: ${token.screenMD}px) {
      min-height: 56px;
      gap: 4px;
      padding-inline: 8px;
    }
  `,
  titleGroup: css`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
  `,
  backButton: css`
    color: ${token.colorText};
  `,
  titleAfterBack: css`
    margin-left: 0;
  `,
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
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      gap: 0;
    }
  `,
  headerAction: css`
    color: ${token.colorTextSecondary};
  `,
  actionActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  divider: css`
    width: 1px;
    height: 22px;
    margin: 0 6px;
    background: ${token.colorBorderSecondary};

    @media (max-width: ${token.screenMD}px) {
      margin-inline: 2px;
    }
  `,
}));

interface ChannelDetailProps {
  workspaceId: string;
  channel: Channel;
  membersVisible: boolean;
  onToggleMembers: () => void;
  onBack?: () => void;
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
  const [, setParams] = useSearchParams();
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const { join, leave } = useChannelMembership(workspaceId, channel.id);
  const [editing, setEditing] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const canManage = canManageChannel(channel, currentMember);
  const actionSize = onBack ? 40 : 36;

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

  const menuItems = [
    ...(canManage
      ? [{ key: 'settings', label: 'Налаштування каналу', icon: <GearSixIcon size={17} /> }]
      : []),
    ...(channel.isMember
      ? [{ key: 'leave', label: 'Вийти з каналу', icon: <SignOutIcon size={17} />, danger: true }]
      : []),
  ];
  const channelIcon =
    channel.kind === 'private' ? <LockSimpleIcon size={21} /> : <HashIcon size={21} />;
  const title = (
    <>
      {channelIcon}
      <span className={styles.name}>{channel.name}</span>
      {menuItems.length > 0 && <CaretDownIcon size={14} />}
    </>
  );

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {onBack && (
            <IconButton
              size={40}
              className={styles.backButton}
              aria-label="Назад до каналів"
              onClick={onBack}
            >
              <ArrowLeftIcon size={20} />
            </IconButton>
          )}
          {menuItems.length > 0 ? (
            <Dropdown
              menu={{
                items: menuItems,
                onClick: ({ key }) => {
                  if (key === 'settings') setEditing(true);
                  if (key === 'leave') handleLeave();
                },
              }}
              trigger={['click']}
            >
              <button
                type="button"
                className={cx(styles.titleButton, onBack && styles.titleAfterBack)}
                aria-label={`Дії каналу ${channel.name}`}
              >
                {title}
              </button>
            </Dropdown>
          ) : (
            <div className={cx(styles.titleButton, onBack && styles.titleAfterBack)}>{title}</div>
          )}
        </div>
        <div className={styles.headerActions}>
          {!channel.isMember && channel.kind === 'public' && (
            <Button
              type="primary"
              loading={join.isPending}
              onClick={() =>
                join.mutate(undefined, {
                  onError: () => message.error('Не вдалося приєднатися до каналу.'),
                })
              }
            >
              Приєднатися
            </Button>
          )}
          {channel.isMember && (
            <ChannelNotificationsPopover
              key={`${workspaceId}:${channel.id}`}
              workspaceId={workspaceId}
              channelId={channel.id}
              compact={Boolean(onBack)}
            />
          )}
          <Popover
            trigger="click"
            open={pinnedOpen}
            onOpenChange={setPinnedOpen}
            content={
              <PinnedMessages
                workspaceId={workspaceId}
                channelId={channel.id}
                onJump={(messageId) => {
                  setParams({ message: messageId }, { replace: true });
                  setPinnedOpen(false);
                }}
              />
            }
            title="Закріплені повідомлення"
          >
            <Tooltip title="Закріплені повідомлення">
              <IconButton
                size={actionSize}
                className={cx(styles.headerAction, pinnedOpen && styles.actionActive)}
                aria-label="Закріплені повідомлення"
                aria-pressed={pinnedOpen}
              >
                <PushPinIcon size={21} weight={pinnedOpen ? 'duotone' : 'regular'} />
              </IconButton>
            </Tooltip>
          </Popover>
          <Tooltip title="Дзвінки в каналі з’являться незабаром">
            <span>
              <IconButton
                size={actionSize}
                className={styles.headerAction}
                aria-label="Дзвінок у каналі"
                disabled
              >
                <PhoneIcon size={21} />
              </IconButton>
            </span>
          </Tooltip>
          <span className={styles.divider} />
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
        </div>
      </div>
      <ConversationView
        canPost={channel.isMember}
        canManage={canManage}
        currentMemberId={currentMember?.id}
      />
      {canManage && (
        <ChannelFormModal
          workspaceId={workspaceId}
          channel={channel}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
