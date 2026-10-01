import { ArrowLeftIcon, GearSixIcon, UserPlusIcon } from '@phosphor-icons/react';
import { Drawer } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { Channel } from '../../channels/types';
import { AddChannelMemberControl } from '../../memberships/components/AddChannelMemberControl';

const useStyles = createStyles(({ token, css }) => ({
  sheet: css`
    :global(.ant-drawer-content) {
      border-radius: 20px 20px 0 0;
      overflow: hidden;
    }
    :global(.ant-drawer-body) {
      padding: 8px 12px calc(16px + env(safe-area-inset-bottom, 0px));
    }
  `,
  handle: css`
    width: 36px;
    height: 4px;
    margin: 2px auto 16px;
    border-radius: 2px;
    background: ${token.colorBorder};
  `,
  action: css`
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 48px;
    padding: 8px 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    text-align: left;

    &:active {
      background: ${token.colorFillTertiary};
    }
  `,
  heading: css`
    margin: 4px 12px 8px;
    color: ${token.colorText};
    font-weight: 650;
  `,
  picker: css`
    padding: 4px 12px 8px;
  `,
}));

interface ChannelActionSheetProps {
  open: boolean;
  workspaceId: string;
  channel: Channel;
  canAddMember: boolean;
  canManage: boolean;
  onClose: () => void;
  onSettings: () => void;
}

export function ChannelActionSheet({
  open,
  workspaceId,
  channel,
  canAddMember,
  canManage,
  onClose,
  onSettings,
}: ChannelActionSheetProps) {
  const { styles } = useStyles();
  const [view, setView] = useState<'actions' | 'members'>('actions');

  function close() {
    setView('actions');
    onClose();
  }

  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={close}
      closable={false}
      height="auto"
      className={styles.sheet}
      aria-label={`Дії каналу ${channel.name}`}
    >
      <div className={styles.handle} aria-hidden="true" />
      {view === 'members' ? (
        <>
          <button type="button" className={styles.action} onClick={() => setView('actions')}>
            <ArrowLeftIcon size={20} />
            Назад до дій
          </button>
          <div className={styles.heading}>Додати учасника до {channel.name}</div>
          <div className={styles.picker}>
            <AddChannelMemberControl workspaceId={workspaceId} channel={channel} size="middle" />
          </div>
        </>
      ) : (
        <>
          <div className={styles.heading}>{channel.name}</div>
          {canAddMember && (
            <button type="button" className={styles.action} onClick={() => setView('members')}>
              <UserPlusIcon size={20} />
              Додати учасника
            </button>
          )}
          {canManage && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                close();
                onSettings();
              }}
            >
              <GearSixIcon size={20} />
              Налаштування каналу
            </button>
          )}
        </>
      )}
    </Drawer>
  );
}
