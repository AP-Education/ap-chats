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
    border-radius: 12px;
    // It floats over the history like the composer it stands in for, so it takes the same glass.
    background: var(--glass, rgba(255, 255, 255, 0.86));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    box-shadow: 0 1px 2px rgba(23, 46, 42, 0.12);
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
