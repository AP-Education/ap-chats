import { EyeIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  footer: css`
    flex-shrink: 0;
    padding: 0 ${token.paddingLG}px ${token.paddingSM}px;

    @media (max-width: ${token.screenMD}px) {
      padding: 0 16px calc(8px + var(--app-inset-bottom, env(safe-area-inset-bottom, 0px)));
    }
  `,
  surface: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 8px 16px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    pointer-events: auto;
  `,
}));

export function ReadOnlyChannelFooter() {
  const { styles } = useStyles();

  return (
    <div className={styles.footer}>
      <div className={styles.surface}>
        <EyeIcon size={18} />У цьому каналі ви можете лише читати
      </div>
    </div>
  );
}
