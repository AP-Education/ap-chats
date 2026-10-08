import { LoadingIcon } from '@ap-education/ui';
import { createStyles, keyframes } from 'antd-style';
import type { ButtonHTMLAttributes } from 'react';

import { CALL_PALETTE } from '../../callTheme';
// Hang-up reads as a pill, wider than the round toggles beside it.
const WIDE_RATIO = 1.36;

const invite = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(47, 158, 107, 0.5); }
  70% { box-shadow: 0 0 0 16px rgba(47, 158, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(47, 158, 107, 0); }
`;

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${token.colorFillSecondary};
    backdrop-filter: blur(16px);
    color: ${token.colorTextLightSolid};
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;

    &:hover:not(:disabled) {
      background: ${token.colorFill};
    }

    &:active:not(:disabled) {
      transform: scale(0.94);
    }

    &:focus-visible {
      outline: 2px solid ${token.colorText};
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  `,
  glass: css``,
  pressed: css`
    background: ${token.colorWhite};
    color: ${token.colorBgLayout};

    &:hover:not(:disabled) {
      background: ${token.colorTextSecondary};
    }
  `,
  danger: css`
    background: ${CALL_PALETTE.danger};

    &:hover:not(:disabled) {
      background: ${CALL_PALETTE.dangerHover};
    }
  `,
  accept: css`
    background: ${CALL_PALETTE.accept};
    animation: ${invite} 1.8s ease-out infinite;

    &:hover:not(:disabled) {
      background: ${CALL_PALETTE.acceptHover};
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
}));

export type CallActionTone = 'glass' | 'pressed' | 'danger' | 'accept';

interface CallActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size: number;
  /** `pressed` marks a toggle that departs from the call's default, like a muted mic. */
  tone?: CallActionTone;
  wide?: boolean;
  /** Swaps the icon for a spinner while the action is on its way. */
  loading?: boolean;
}

/** The one round control of every call surface: full screen, mini bar and incoming card. */
export function CallActionButton({
  size,
  tone = 'glass',
  wide = false,
  loading = false,
  className,
  style,
  type = 'button',
  children,
  ...rest
}: CallActionButtonProps) {
  const { styles, cx } = useStyles();
  const width = wide ? Math.round(size * WIDE_RATIO) : size;

  return (
    <button
      type={type}
      className={cx(styles.button, styles[tone], className)}
      style={{ width, height: size, ...style }}
      {...rest}
    >
      {loading ? <LoadingIcon size={Math.round(size * 0.375)} /> : children}
    </button>
  );
}
