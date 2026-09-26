import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, Empty, Input, List, message, Modal, Popconfirm, Spin, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useChannelCategories } from '../../hooks/useChannelCategories';
import type { ChannelCategory } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  name: css`
    cursor: text;
    padding: 2px 0;
  `,
  createRow: css`
    display: flex;
    gap: ${token.marginXS}px;
    margin-top: ${token.marginSM}px;
  `,
}));

interface ChannelCategoriesModalProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

// Owner-only taxonomy management: rename/delete existing categories, add new
// ones. Position isn't exposed here — the API list is already sorted, and
// manual reordering isn't part of this increment.
export function ChannelCategoriesModal({
  workspaceId,
  open,
  onClose,
}: ChannelCategoriesModalProps) {
  const { styles } = useStyles();
  const { query, create, update, remove } = useChannelCategories(workspaceId);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function startEdit(category: ChannelCategory) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function commitEdit() {
    const trimmed = editingName.trim();
    if (editingId && trimmed) {
      update.mutate(
        { categoryId: editingId, input: { name: trimmed } },
        { onError: () => void message.error('Не вдалося перейменувати категорію.') },
      );
    }
    setEditingId(null);
  }

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed },
      {
        onSuccess: () => setNewName(''),
        onError: () => void message.error('Не вдалося створити категорію.'),
      },
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Категорії каналів"
      destroyOnHidden
      centered
    >
      {query.isLoading ? (
        <Spin size="small" />
      ) : (
        <List
          dataSource={query.data ?? []}
          locale={{
            emptyText: (
              <Empty description="Категорій ще немає" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          }}
          renderItem={(category) => (
            <List.Item
              key={category.id}
              actions={[
                <Popconfirm
                  key="delete"
                  title="Видалити категорію?"
                  description="Її канали залишаться без категорії."
                  okText="Видалити"
                  okButtonProps={{ danger: true }}
                  cancelText="Скасувати"
                  onConfirm={() =>
                    remove.mutate(category.id, {
                      onError: () => void message.error('Не вдалося видалити категорію.'),
                    })
                  }
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<TrashIcon size={16} />}
                    aria-label={`Видалити категорію ${category.name}`}
                  />
                </Popconfirm>,
              ]}
            >
              {editingId === category.id ? (
                <Input
                  size="small"
                  value={editingName}
                  autoFocus
                  onChange={(event) => setEditingName(event.target.value)}
                  onPressEnter={commitEdit}
                  onBlur={commitEdit}
                />
              ) : (
                <Typography.Text className={styles.name} onClick={() => startEdit(category)}>
                  {category.name}
                </Typography.Text>
              )}
            </List.Item>
          )}
        />
      )}
      <div className={styles.createRow}>
        <Input
          placeholder="Нова категорія"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onPressEnter={handleCreate}
        />
        <Button
          type="primary"
          icon={<PlusIcon size={16} />}
          loading={create.isPending}
          onClick={handleCreate}
        >
          Додати
        </Button>
      </div>
    </Modal>
  );
}
