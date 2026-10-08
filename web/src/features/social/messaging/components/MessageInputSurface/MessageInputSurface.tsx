import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  // Frosted over the chat wallpaper, the same material as the bubbles above it.
  surface: css`
    flex: 1;
    min-width: 0;
    border-radius: ${token.borderRadiusLG}px;
    background: var(--glass, rgba(255, 255, 255, 0.86));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    box-shadow:
      0 1px 2px rgba(23, 46, 42, 0.12),
      0 6px 20px rgba(23, 46, 42, 0.06);
    transition: box-shadow 0.15s ease;

    // Focus lifts the surface instead of outlining it: a ring around the rounded corners
    // reads as a stray border, and the caret already shows where typing goes.
    &:focus-within {
      box-shadow:
        0 1px 2px rgba(23, 46, 42, 0.14),
        0 8px 24px rgba(23, 46, 42, 0.12);
    }

    @media (prefers-reduced-transparency: reduce) {
      background: ${token.colorBgContainer};
    }

    // A pill beside the round attach and send buttons, all one 44px touch height.
    @media (max-width: ${token.screenMD}px) {
      border-radius: 22px;
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
      padding: ${token.paddingXXS}px ${token.paddingXXS}px ${token.paddingXXS}px ${token.padding}px;
    }
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  compact: css`
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
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
