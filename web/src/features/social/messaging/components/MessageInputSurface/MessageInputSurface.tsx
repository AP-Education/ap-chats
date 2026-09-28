import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  surface: css`
    flex: 1;
    min-width: 0;
    border: 1px solid ${token.colorBorder};
    border-radius: 12px;
    background: ${token.colorBgContainer};
    box-shadow: 0 2px 8px ${token.colorFillQuaternary};
    &:focus-within {
      border-color: ${token.colorPrimaryBorder};
    }
    @media (max-width: ${token.screenMD}px) {
      border-color: ${token.colorBorderSecondary};
      border-radius: 14px;
      background: ${token.colorFillQuaternary};
      box-shadow: none;
    }
  `,
  context: css`
    padding: 8px 12px 0;
  `,
  line: css`
    display: flex;
    align-items: flex-end;
    gap: 5px;
    min-width: 0;
    padding: 7px 12px;
    @media (max-width: ${token.screenMD}px) {
      gap: 4px;
      padding: 4px 4px 4px 12px;
    }
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  compact: css`
    border-radius: 6px;
    box-shadow: none;

    @media (max-width: ${token.screenMD}px) {
      background: ${token.colorBgContainer};
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
