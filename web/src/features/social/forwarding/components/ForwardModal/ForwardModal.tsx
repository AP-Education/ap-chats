import { ArrowBendUpRightIcon } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, message, Modal } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { confirmDirectMessage, mergeDirectMessage } from '@/features/social/direct-messages/cache';
import type { MessageHistoryItem } from '@/features/social/messaging/types';

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
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<ForwardTarget | null>(null);
  const [batchNonce, setBatchNonce] = useState(() => crypto.randomUUID());
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
      if (result.conversation)
        mergeDirectMessage(queryClient, identity, workspaceId, result.conversation);
      const targetChannelId = result.conversation?.id ?? target.id;
      if (target.kind !== 'channel' && result.messages.length) {
        confirmDirectMessage(
          queryClient,
          identity,
          workspaceId,
          targetChannelId,
          result.messages.at(-1)!,
        );
      }
      message.success('Повідомлення переслано');
      onClose();
    } catch {
      message.error('Не вдалося переслати повідомлення. Спробуйте ще раз.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title={
        items.length === 1 ? 'Переслати повідомлення' : `Переслати повідомлення (${items.length})`
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
          setBatchNonce(crypto.randomUUID());
        }}
      />
      <div className={styles.footer}>
        <span className={styles.destination}>
          {target ? `Куди: ${target.name}` : 'Оберіть адресата'}
        </span>
        <Button
          type="primary"
          icon={<ArrowBendUpRightIcon size={18} />}
          disabled={!target}
          loading={sending}
          onClick={() => void submit()}
        >
          Переслати
        </Button>
      </div>
    </Modal>
  );
}
