import { createStyles } from 'antd-style';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: ${token.colorFillTertiary};
      color: ${token.colorPrimary};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
}));

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button box side in px. The icon itself is sized by its own `size` prop. */
  size?: number;
}

// A ghost icon button: transparent by default, a soft fill on hover, no
// leftover browser button padding to squeeze the icon — used anywhere a bare
// phosphor icon needs to be clickable (sidebar header actions, channel row
// hover actions, composer toolbar).
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 28, className, style, type = 'button', ...rest },
  ref,
) {
  const { styles, cx } = useStyles();
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
});
