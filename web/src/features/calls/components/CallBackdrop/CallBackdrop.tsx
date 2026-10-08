import { createStyles, keyframes } from 'antd-style';

import { CALL_AURORA } from '../../callTheme';
const drift = keyframes`
  0%, 100% { transform: translate3d(-3%, -2%, 0) rotate(0deg) scale(1); }
  50% { transform: translate3d(3%, 2%, 0) rotate(6deg) scale(1.08); }
`;

const useStyles = createStyles(({ token, css }) => ({
  backdrop: css`
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background: ${token.colorBgLayout};
    pointer-events: none;

    // Only the oversized light layer moves, so the drift stays on the compositor.
    &::before {
      content: '';
      position: absolute;
      inset: -25%;
      background: ${CALL_AURORA};
      animation: ${drift} 32s ease-in-out infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(0, 0, 0, 0.32));
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        animation: none;
      }
    }
  `,
}));

/** The slow brand aurora every full call surface sits on. */
export function CallBackdrop() {
  const { styles } = useStyles();
  return <span className={styles.backdrop} aria-hidden />;
}
