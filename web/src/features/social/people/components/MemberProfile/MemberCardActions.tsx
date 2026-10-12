import { ChatTextIcon } from '@phosphor-icons/react';
import { Button, message as toast } from 'antd';
import { createStyles } from 'antd-style';

import { CallIcon } from '@/features/calls/callIcons';
import { useOpenDirectMessage } from '@/features/social/direct-messages/hooks/useOpenDirectMessage';

const useStyles = createStyles(({ css }) => ({
  // Rests at the bottom of a fixed-height sheet, within reach of the thumb.
  actions: css`
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 20px;
  `,
  message: css`
    flex: 1;
  `,
}));

interface MemberCardActionsProps {
  workspaceId: string;
  memberId: string;
  unavailable: boolean;
  onConversationOpen: () => void;
}

export function MemberCardActions({
  workspaceId,
  memberId,
  unavailable,
  onConversationOpen,
}: MemberCardActionsProps) {
  const { styles } = useStyles();
  const { open, opening } = useOpenDirectMessage(workspaceId);

  return (
    <div className={styles.actions}>
      <Button
        type="primary"
        className={styles.message}
        icon={<ChatTextIcon size={20} />}
        loading={opening}
        disabled={unavailable}
        onClick={() => {
          void open(memberId).then(onConversationOpen, () =>
            toast.error('Не вдалося відкрити розмову.'),
          );
        }}
      >
        Написати
      </Button>
      <Button icon={<CallIcon size={20} />} aria-label="Подзвонити" disabled />
    </div>
  );
}
