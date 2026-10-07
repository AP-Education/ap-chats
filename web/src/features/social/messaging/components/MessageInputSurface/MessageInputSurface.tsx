import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  // Frosted over the chat wallpaper, the same material as the bubbles above it.
  surface: css`
    flex: 1;
    min-width: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px) saturate(1.7);
    box-shadow:
      0 1px 2px rgba(23, 46, 42, 0.12),
      0 6px 20px rgba(23, 46, 42, 0.06);
    transition: box-shadow 0.15s ease;

    &:focus-within {
      box-shadow:
        0 0 0 1.5px ${token.colorPrimaryBorder},
        0 6px 20px rgba(23, 46, 42, 0.08);
    }

    @media (max-width: ${token.screenMD}px) {
      border-radius: 14px;
    }

    @media (prefers-reduced-transparency: reduce) {
      background: ${token.colorBgContainer};
    }
  `,
  context: css`
    padding: 10px 12px 0;
  `,
  line: css`
    display: flex;
    align-items: flex-end;
    gap: 4px;
    min-width: 0;
    padding: 6px 8px;
    @media (max-width: ${token.screenMD}px) {
      padding: 3px 4px 3px 10px;
    }
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  compact: css`
    border: 1px solid ${token.colorBorder};
    border-radius: 10px;
    background: ${token.colorBgContainer};
    backdrop-filter: none;
    box-shadow: none;

    &:focus-within {
      border-color: ${token.colorPrimaryBorder};
      box-shadow: none;
    }
  `,
  compactLine: css`
    align-items: flex-end;
    gap: 4px;
    padding: 4px 6px 4px 10px;
  `,
}));

interface MessageInputSurfaceProps extends PropsWithChildren {
  context?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
}

export function MessageInputSurface({
  context,
  leading,
  trailing,
  compact = false,
  children,
}: MessageInputSurfaceProps) {
  const { styles, cx } = useStyles();
  return (
    <div className={cx(styles.surface, compact && styles.compact)}>
      {context && <div className={styles.context}>{context}</div>}
      <div className={cx(styles.line, compact && styles.compactLine)}>
        {leading}
        <div className={styles.body}>{children}</div>
        {trailing}
      </div>
    </div>
  );
}
