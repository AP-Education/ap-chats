import { StickerIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  state: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    text-align: center;
    padding: 0 16px;
  `,
}));

export function StickerTab() {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');

  return (
    <div className={styles.state}>
      <StickerIcon size={28} />
      {t(($) => $.picker.stickersSoon)}
    </div>
  );
}
