import { IconButton } from '@ap-education/ui';
import { ListBulletsIcon, PushPinIcon, XIcon } from '@phosphor-icons/react';
import { message as toast, Popover } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConversationPermissions } from '@/features/social/conversation-scope/store';
import { ReplyExcerpt } from '@/features/social/messaging/components/ReplyExcerpt/ReplyExcerpt';

import { PinnedMessages } from '../PinnedMessages/PinnedMessages';
import styles from './PinnedMessageBar.module.css';
import { usePinnedMessageBar } from './usePinnedMessageBar';

interface PinnedMessageBarProps {
  onJump: (messageId: string) => void;
}

export function PinnedMessageBar({ onJump }: PinnedMessageBarProps) {
  const { t } = useTranslation('pins');
  const { canPin: canUnpin } = useConversationPermissions();
  const [listOpen, setListOpen] = useState(false);
  const bar = usePinnedMessageBar();

  if (!bar) return null;
  const { current, position, total, advance, unpin } = bar;

  function showAndAdvance() {
    onJump(current.messageId);
    advance();
  }

  function handleUnpin() {
    void unpin().catch(() => toast.error(t(($) => $.unpinFailed)));
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
        <ReplyExcerpt
          title={t(($) => $.pinnedMessage)}
          markdown={current.markdown}
          blocks={current.blocks}
        />
      </button>
      <div className={styles.controls}>
        <Popover
          trigger="click"
          open={listOpen}
          onOpenChange={setListOpen}
          placement="bottomRight"
          title={t(($) => $.pinnedMessages)}
          content={
            <PinnedMessages
              onJump={(messageId) => {
                onJump(messageId);
                setListOpen(false);
              }}
            />
          }
        >
          <IconButton size={32} aria-label={t(($) => $.showAll)}>
            <ListBulletsIcon size={18} />
          </IconButton>
        </Popover>
        {canUnpin && (
          <IconButton size={32} aria-label={t(($) => $.unpin)} onClick={handleUnpin}>
            <XIcon size={16} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
