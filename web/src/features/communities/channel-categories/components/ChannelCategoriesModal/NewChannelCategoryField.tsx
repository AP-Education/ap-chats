import { PlusIcon } from '@phosphor-icons/react';
import { Button, Input, message } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useChannelCategories } from '../../hooks/useChannelCategories';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    gap: ${token.marginXS}px;
    margin-top: ${token.marginSM}px;
  `,
}));

export function NewChannelCategoryField({ workspaceId }: { workspaceId: string }) {
  const { styles } = useStyles();
  const { create } = useChannelCategories(workspaceId);
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed },
      {
        onSuccess: () => setName(''),
        onError: () => void message.error('Не вдалося створити категорію.'),
      },
    );
  }

  return (
    <div className={styles.row}>
      <Input
        placeholder="Нова категорія"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onPressEnter={submit}
      />
      <Button
        type="primary"
        icon={<PlusIcon size={16} />}
        loading={create.isPending}
        onClick={submit}
      >
        Додати
      </Button>
    </div>
  );
}
