import { ChatsCircleIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  empty: css`
    display: grid;
    place-content: center;
    flex: 1;
    padding: ${token.paddingXL}px;
  `,
  emptyCard: css`
    display: grid;
    justify-items: center;
    gap: ${token.paddingXS}px;
    max-width: 260px;
    padding: ${token.paddingMD}px ${token.paddingLG}px;
    border-radius: ${token.borderRadiusLG}px;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    color: ${token.colorWhite};
    font-weight: 600;
    text-align: center;
  `,
}));

export function EmptyTimeline() {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');

  return (
    <div className={styles.empty}>
      <div className={styles.emptyCard}>
        <ChatsCircleIcon size={36} weight="duotone" aria-hidden />
        {t(($) => $.timeline.empty)}
      </div>
    </div>
  );
}
