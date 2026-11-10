import { useQueryClient } from '@tanstack/react-query';
import { Button, message, Modal } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { confirmDirectMessage, mergeDirectMessage } from '@/features/social/direct-messages/cache';
import { ForwardIcon } from '@/features/social/messaging/actionIcons';
import { flashMessage } from '@/features/social/messaging/flashMessage';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { randomId } from '@/shared/lib/random-id';

import { forwardMessages } from '../../api/forwarding-api';
import type { ForwardTarget } from './forward-targets';
import { ForwardTargetPicker } from './ForwardTargetPicker';

const useStyles = createStyles(({ token, css }) => ({
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
  `,
  destination: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorTextSecondary};
    font-size: 14px;
  `,
}));

interface ForwardModalProps {
  workspaceId: string;
  sourceChannelId: string;
  items: MessageHistoryItem[];
  onClose: () => void;
}

export function ForwardModal({ workspaceId, sourceChannelId, items, onClose }: ForwardModalProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['forwarding', 'common']);
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<ForwardTarget | null>(null);
  const [batchNonce, setBatchNonce] = useState(randomId);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!token || !target || sending) return;
    setSending(true);
    try {
      const result = await forwardMessages(
        token,
        workspaceId,
        { kind: target.kind === 'person' ? 'member' : 'channel', id: target.id },
        sourceChannelId,
        items.map((item) => item.message.id),
        batchNonce,
      );
      if (result.conversation) mergeDirectMessage(queryClient, identity, result.conversation);
      const targetChannelId = result.conversation?.id ?? target.id;
      if (target.kind !== 'channel' && result.messages.length) {
        confirmDirectMessage(queryClient, identity, targetChannelId, result.messages.at(-1)!);
      }
      items.forEach((item) => flashMessage(item.message.id));
      onClose();
    } catch {
      message.error(t(($) => $.failed));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title={
        items.length === 1 ? t(($) => $.title) : t(($) => $.titleWithCount, { count: items.length })
      }
      open
      width={560}
      footer={null}
      onCancel={onClose}
      maskClosable={!sending}
      keyboard={!sending}
      closable={!sending}
      destroyOnHidden
    >
      <ForwardTargetPicker
        workspaceId={workspaceId}
        selected={target}
        onSelect={(next) => {
          setTarget(next);
          setBatchNonce(randomId());
        }}
      />
      <div className={styles.footer}>
        <span className={styles.destination}>
          {target ? t(($) => $.destination, { name: target.name }) : t(($) => $.chooseRecipient)}
        </span>
        <Button
          type="primary"
          icon={<ForwardIcon size={18} />}
          disabled={!target}
          loading={sending}
          onClick={() => void submit()}
        >
          {t(($) => $.common.actions.forward)}
        </Button>
      </div>
    </Modal>
  );
}
