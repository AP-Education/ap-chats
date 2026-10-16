import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  retry: css`
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--bubble-meta);
    font-size: ${token.fontSizeSM}px;
  `,
  button: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--bubble-link);
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  `,
}));

interface BubbleRetryProps {
  status: ReactNode;
  /** Left out when trying again cannot help. */
  onRetry?: () => void;
}

/** What stopped a failed bubble, and the way to try it again. */
export function BubbleRetry({ status, onRetry }: BubbleRetryProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.retry}>
      {status}
      {onRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          Повторити
        </button>
      )}
    </div>
  );
}
