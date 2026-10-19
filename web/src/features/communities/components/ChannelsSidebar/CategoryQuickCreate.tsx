import { PlusIcon } from '@phosphor-icons/react';
import { Button, Input, message, Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ css }) => ({
  content: css`
    display: flex;
    gap: 6px;
    width: 220px;
  `,
}));

interface CategoryQuickCreateProps {
  isPending: boolean;
  onCreate: (name: string) => Promise<unknown>;
}

// The header's "+": a lightweight popover to name a new category, distinct
// from the gear icon's full manage (rename/delete existing) modal.
export function CategoryQuickCreate({ isPending, onCreate }: CategoryQuickCreateProps) {
  const { t } = useTranslation(['communities', 'common']);
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await onCreate(trimmed);
      setName('');
      setOpen(false);
    } catch {
      void message.error(t(($) => $.categories.createFailed));
    }
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
            placeholder={t(($) => $.categories.namePlaceholder)}
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onPressEnter={() => void handleSubmit()}
          />
          <Button
            size="small"
            type="primary"
            loading={isPending}
            onClick={() => void handleSubmit()}
          >
            {t(($) => $.common.actions.add)}
          </Button>
        </div>
      }
    >
      <Button
        type="text"
        size="small"
        icon={<PlusIcon size={18} />}
        aria-label={t(($) => $.categories.create)}
      >
        {t(($) => $.categories.shortTitle)}
      </Button>
    </Popover>
  );
}
