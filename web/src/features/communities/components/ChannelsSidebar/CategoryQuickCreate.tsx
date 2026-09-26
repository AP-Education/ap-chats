import { PlusIcon } from '@phosphor-icons/react';
import { Button, Input, Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

const useStyles = createStyles(({ css }) => ({
  content: css`
    display: flex;
    gap: 6px;
    width: 220px;
  `,
}));

interface CategoryQuickCreateProps {
  isPending: boolean;
  onCreate: (name: string) => void;
}

// The header's "+": a lightweight popover to name a new category, distinct
// from the gear icon's full manage (rename/delete existing) modal.
export function CategoryQuickCreate({ isPending, onCreate }: CategoryQuickCreateProps) {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setName('');
      }}
      trigger="click"
      placement="bottomRight"
      content={
        <div className={styles.content}>
          <Input
            size="small"
            placeholder="Назва категорії"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onPressEnter={handleSubmit}
          />
          <Button size="small" type="primary" loading={isPending} onClick={handleSubmit}>
            Додати
          </Button>
        </div>
      }
    >
      <Button
        type="text"
        size="small"
        icon={<PlusIcon size={16} />}
        aria-label="Створити категорію"
      >
        Категорія
      </Button>
    </Popover>
  );
}
