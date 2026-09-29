import { createStyles } from 'antd-style';
import type { ButtonHTMLAttributes } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    color: ${token.colorWhite};
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.24);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  off: css`
    background: ${token.colorWhite};
    color: ${token.colorTextHeading};

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.85);
    }
  `,
  leave: css`
    background: ${token.colorError};

    &:hover:not(:disabled) {
      background: ${token.colorErrorHover};
    }
  `,
}));

interface CallActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size: number;
  variant?: 'default' | 'off' | 'leave';
}

// Shared circular control for both the full call screen and the mini bar, so
// mic/camera/leave read as the same design language wherever the call is.
export function CallActionButton({
  size,
  variant = 'default',
  className,
  style,
  type = 'button',
  ...rest
}: CallActionButtonProps) {
  const { styles, cx } = useStyles();

  return (
    <button
      type={type}
      className={cx(
        styles.button,
        variant === 'off' && styles.off,
        variant === 'leave' && styles.leave,
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
}
