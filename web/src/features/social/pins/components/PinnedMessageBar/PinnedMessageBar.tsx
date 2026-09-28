import { ListBulletsIcon, PushPinIcon, XIcon } from '@phosphor-icons/react';
import { message as toast, Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { ReplyExcerpt } from '@/features/social/messaging/components/ReplyExcerpt/ReplyExcerpt';
import { IconButton } from '@/shared/ui/IconButton';

import { usePinActions, usePins } from '../../hooks/usePins';
import { PinnedMessages } from '../PinnedMessages/PinnedMessages';

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    min-height: 52px;
    padding: 0 20px;
    border-bottom: 1px solid ${token.colorBorderSecondary};

    @media (max-width: ${token.screenMD}px) {
      gap: 6px;
      padding-inline: 8px;
    }
  `,
  pin: css`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    color: ${token.colorPrimary};
  `,
  count: css`
    font-size: 11px;
    font-weight: 650;
  `,
  body: css`
    display: block;
    flex: 1;
    min-width: 0;
    padding: 6px 0;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
  `,
  controls: css`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    color: ${token.colorTextSecondary};
  `,
}));

interface PinnedMessageBarProps {
  workspaceId: string;
  channelId: string;
  canUnpin: boolean;
  onJump: (messageId: string) => void;
}

export function PinnedMessageBar({
  workspaceId,
  channelId,
  canUnpin,
  onJump,
}: PinnedMessageBarProps) {
  const { styles } = useStyles();
  const { data: pins } = usePins(workspaceId, channelId);
  const { update } = usePinActions(workspaceId, channelId);
  const scopeKey = `${workspaceId}:${channelId}`;
  const [cursor, setCursor] = useState({ scopeKey, index: 0 });
  const [listOpen, setListOpen] = useState(false);
  if (cursor.scopeKey !== scopeKey) setCursor({ scopeKey, index: 0 });

  if (!pins?.length) return null;

  const position = Math.min(cursor.index, pins.length - 1);
  const current = pins[position]!;

  function showAndAdvance() {
    onJump(current.messageId);
    setCursor({ scopeKey, index: (position + 1) % pins!.length });
  }

  function unpinCurrent() {
    void update(current.messageId, false).catch(() =>
      toast.error('Не вдалося відкріпити повідомлення.'),
    );
  }

  return (
    <div className={styles.bar}>
      <span className={styles.pin}>
        <PushPinIcon size={18} weight="fill" />
        {pins.length > 1 && (
          <span className={styles.count}>
            {position + 1}/{pins.length}
          </span>
        )}
      </span>
      <button type="button" className={styles.body} onClick={showAndAdvance}>
        <ReplyExcerpt title="Закріплене повідомлення" markdown={current.markdown} />
      </button>
      <div className={styles.controls}>
        <Popover
          trigger="click"
          open={listOpen}
          onOpenChange={setListOpen}
          placement="bottomRight"
          title="Закріплені повідомлення"
          content={
            <PinnedMessages
              workspaceId={workspaceId}
              channelId={channelId}
              onJump={(messageId) => {
                onJump(messageId);
                setListOpen(false);
              }}
            />
          }
        >
          <Tooltip title="Усі закріплені повідомлення">
            <IconButton size={32} aria-label="Усі закріплені повідомлення">
              <ListBulletsIcon size={18} />
            </IconButton>
          </Tooltip>
        </Popover>
        {canUnpin && (
          <Tooltip title="Відкріпити">
            <IconButton size={32} aria-label="Відкріпити повідомлення" onClick={unpinCurrent}>
              <XIcon size={16} />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
