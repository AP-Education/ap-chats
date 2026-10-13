import { Button, Popconfirm, Typography } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  // Rests at the foot of the settings, apart from the fields above it.
  zone: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginMD}px;
    margin-top: auto;
    padding: 12px 14px;
    border: 1px solid ${token.colorErrorBorder};
    border-radius: ${token.borderRadiusLG}px;
  `,
  text: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  title: css`
    font-weight: 600;
  `,
  hint: css`
    font-size: ${token.fontSizeSM}px;
    line-height: 1.35;
  `,
}));

interface DeleteChannelActionProps {
  isPending: boolean;
  onDelete: () => void;
}

export function DeleteChannelAction({ isPending, onDelete }: DeleteChannelActionProps) {
  const { styles } = useStyles();

  return (
    <section className={styles.zone} aria-label="Видалення каналу">
      <span className={styles.text}>
        <span className={styles.title}>Видалити канал</span>
        <Typography.Text type="secondary" className={styles.hint}>
          Повідомлення й історія зникнуть для всіх без можливості відновлення.
        </Typography.Text>
      </span>
      <Popconfirm
        title="Видалити канал?"
        description="Канал і його історія будуть видалені без можливості відновлення."
        okText="Видалити"
        okButtonProps={{ danger: true, loading: isPending }}
        cancelText="Скасувати"
        onConfirm={onDelete}
      >
        <Button danger loading={isPending}>
          Видалити
        </Button>
      </Popconfirm>
    </section>
  );
}
