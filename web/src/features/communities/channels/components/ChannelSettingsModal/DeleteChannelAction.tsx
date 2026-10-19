import { Button, Popconfirm, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['communities', 'common']);
  const { styles } = useStyles();

  return (
    <section className={styles.zone} aria-label={t(($) => $.channels.delete.zoneLabel)}>
      <span className={styles.text}>
        <span className={styles.title}>{t(($) => $.channels.delete.title)}</span>
        <Typography.Text type="secondary" className={styles.hint}>
          {t(($) => $.channels.delete.hint)}
        </Typography.Text>
      </span>
      <Popconfirm
        title={t(($) => $.channels.delete.confirmTitle)}
        description={t(($) => $.channels.delete.confirmDescription)}
        okText={t(($) => $.common.actions.delete)}
        okButtonProps={{ danger: true, loading: isPending }}
        cancelText={t(($) => $.common.actions.cancel)}
        onConfirm={onDelete}
      >
        <Button danger loading={isPending}>
          {t(($) => $.common.actions.delete)}
        </Button>
      </Popconfirm>
    </section>
  );
}
