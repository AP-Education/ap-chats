import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, message, Modal, Select } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import { MessagePreview } from '@/features/social/messaging/components/MessagePreview/MessagePreview';
import { messagingQueryKeys } from '@/features/social/messaging/queryKeys';
import type { HistoryItem } from '@/features/social/messaging/types';

import { forwardMessages } from '../../api/forwarding-api';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 250px;
    overflow-y: auto;
    margin: 14px 0;
  `,
  item: css`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: ${token.colorFillQuaternary};
  `,
  preview: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  label: css`
    display: block;
    margin-bottom: 6px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
}));

interface ForwardModalProps {
  workspaceId: string;
  sourceChannelId: string;
  items: HistoryItem[];
  onClose: () => void;
}

export function ForwardModal({ workspaceId, sourceChannelId, items, onClose }: ForwardModalProps) {
  const { styles } = useStyles();
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const channels = useChannels(workspaceId, 'joined');
  const [selected, setSelected] = useState(items);
  const [targetId, setTargetId] = useState<string>();
  const [batchNonce, setBatchNonce] = useState(() => crypto.randomUUID());
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!token || !targetId || !selected.length) return;
    setSending(true);
    try {
      await forwardMessages(
        token,
        workspaceId,
        targetId,
        sourceChannelId,
        selected.map((item) => item.message.id),
        batchNonce,
      );
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.channel(identity, workspaceId, targetId),
      });
      message.success(selected.length === 1 ? 'Повідомлення переслано' : 'Повідомлення переслано');
      onClose();
    } catch {
      message.error('Не вдалося переслати. Перевірте канал і повторіть спробу.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Переслати повідомлення"
      open
      onCancel={onClose}
      onOk={() => void submit()}
      okText="Переслати"
      okButtonProps={{ disabled: !targetId || !selected.length, loading: sending }}
      cancelText="Скасувати"
      destroyOnHidden
    >
      <span className={styles.label}>Вибрано: {selected.length}</span>
      <div className={styles.list}>
        {selected.length === 0 && <Empty description="Виберіть повідомлення" />}
        {selected.map((item) => (
          <div key={item.message.id} className={styles.item}>
            <span className={styles.preview}>
              <MessagePreview markdown={item.message.markdown} />
            </span>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelected((current) =>
                  current.filter((entry) => entry.message.id !== item.message.id),
                );
                setBatchNonce(crypto.randomUUID());
              }}
            >
              Прибрати
            </Button>
          </div>
        ))}
      </div>
      <label className={styles.label} htmlFor="forward-target">
        Канал призначення
      </label>
      <Select
        id="forward-target"
        showSearch
        optionFilterProp="label"
        value={targetId}
        onChange={(value) => {
          setTargetId(value);
          setBatchNonce(crypto.randomUUID());
        }}
        placeholder="Оберіть канал"
        style={{ width: '100%' }}
        options={channels.data
          ?.filter((channel) => channel.isMember)
          .map((channel) => ({ value: channel.id, label: `# ${channel.name}` }))}
        loading={channels.isPending}
      />
    </Modal>
  );
}
