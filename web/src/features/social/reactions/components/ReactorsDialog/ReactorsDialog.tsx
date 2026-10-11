import { useIsMobile } from '@ap-education/ui';
import { Modal } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { reactionsLabel, totalReactions } from '../../reaction-display';
import { ReactionTabs } from './ReactionTabs';
import { ReactorList } from './ReactorList';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0 0 12px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
}));

interface ReactorsDialogProps {
  item: MessageHistoryItem;
  onClose: () => void;
}

/** Who reacted and with what: a dialog beside the conversation, a sheet on a phone. */
export function ReactorsDialog({ item, onClose }: ReactorsDialogProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const [emoji, setEmoji] = useState<string | undefined>();

  const reactions = item.reactions ?? [];
  const total = totalReactions(reactions);
  const title = reactionsLabel(total);
  const expected = emoji
    ? (reactions.find((reaction) => reaction.emoji === emoji)?.count ?? 0)
    : total;

  const content = (
    <>
      <ReactionTabs reactions={reactions} total={total} selected={emoji} onSelect={setEmoji} />
      <ReactorList messageId={item.message.id} emoji={emoji} expected={expected} />
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} aria-label={title}>
        <h2 className={styles.title}>{title}</h2>
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal open onCancel={onClose} footer={null} width={400} title={title}>
      {content}
    </Modal>
  );
}
