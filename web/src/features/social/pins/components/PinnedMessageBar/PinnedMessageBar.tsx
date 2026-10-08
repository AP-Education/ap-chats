import { IconButton } from '@ap-education/ui';
import { ListBulletsIcon, PushPinIcon, XIcon } from '@phosphor-icons/react';
import { message as toast, Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { ReplyExcerpt } from '@/features/social/messaging/components/ReplyExcerpt/ReplyExcerpt';

import { PinnedMessages } from '../PinnedMessages/PinnedMessages';
import { usePinnedMessageBar } from './usePinnedMessageBar';

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    min-height: 52px;
    padding: 0 20px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: var(--app-surface, rgba(255, 255, 255, 0.92));
    backdrop-filter: var(--app-surface-blur, blur(48px) saturate(1.2));

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
    font-size: 12px;
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
  canUnpin: boolean;
  onJump: (messageId: string) => void;
}

export function PinnedMessageBar({ canUnpin, onJump }: PinnedMessageBarProps) {
  const { styles } = useStyles();
  const [listOpen, setListOpen] = useState(false);
  const bar = usePinnedMessageBar();

  if (!bar) return null;
  const { current, position, total, advance, unpin } = bar;

  function showAndAdvance() {
    onJump(current.messageId);
    advance();
  }

  function handleUnpin() {
    void unpin().catch(() => toast.error('Не вдалося відкріпити повідомлення.'));
  }

  return (
    <div className={styles.bar}>
      <span className={styles.pin}>
        <PushPinIcon size={18} weight="fill" />
        {total > 1 && (
          <span className={styles.count}>
            {position + 1}/{total}
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
              onJump={(messageId) => {
                onJump(messageId);
                setListOpen(false);
              }}
            />
          }
        >
          <IconButton size={32} aria-label="Усі закріплені повідомлення">
            <ListBulletsIcon size={18} />
          </IconButton>
        </Popover>
        {canUnpin && (
          <IconButton size={32} aria-label="Відкріпити повідомлення" onClick={handleUnpin}>
            <XIcon size={16} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
