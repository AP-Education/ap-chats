import { ContentState, ContentStateDescription, ContentStateIcon } from '@ap-education/ui';
import { FoldersIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, Input, List, message, Popconfirm, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useChannelCategories } from '../../hooks/useChannelCategories';
import type { ChannelCategory } from '../../types';
import { ChannelCategoryListSkeleton } from './ChannelCategoryListSkeleton';

const useStyles = createStyles(({ css }) => ({
  name: css`
    cursor: text;
    padding: 2px 0;
  `,
}));

export function ChannelCategoryList({ workspaceId }: { workspaceId: string }) {
  const { styles } = useStyles();
  const { query, update, remove } = useChannelCategories(workspaceId);
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

  function deleteCategory(categoryId: string) {
    remove.mutate(categoryId, {
      onError: () => void message.error('Не вдалося видалити категорію.'),
    });
  }

  if (query.isLoading) return <ChannelCategoryListSkeleton />;

  return (
    <List
      dataSource={query.data ?? []}
      locale={{
        emptyText: (
          <ContentState compact>
            <ContentStateIcon>
              <FoldersIcon />
            </ContentStateIcon>
            <ContentStateDescription>Категорій ще немає</ContentStateDescription>
          </ContentState>
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
              onConfirm={() => deleteCategory(category.id)}
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
  );
}
