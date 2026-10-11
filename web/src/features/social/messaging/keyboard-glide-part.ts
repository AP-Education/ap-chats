import { css, keyframes } from 'antd-style';

// The keyboard's own curve when the shell sends one; until then, close to the iOS keyboard's spring.
const EASING = 'var(--keyboard-glide-easing, cubic-bezier(0.38, 0.7, 0.125, 1))';

const rise = keyframes`
  to { translate: 0 calc(-1 * var(--keyboard-glide-shift)); }
`;

const fall = keyframes`
  from { translate: 0 calc(-1 * var(--keyboard-glide-shift)); }
`;

// Shared by the timeline and the composer area, which move together. Kept on its own layer in the
// native shell, so a glide starting or ending never adds or drops one in the middle of a frame.
export const keyboardGlidePart = css`
  html[data-native-shell='true'] & {
    will-change: translate;
  }

  [data-keyboard-glide='rising'] & {
    animation: ${rise} var(--keyboard-glide-duration) ${EASING} forwards;
  }

  [data-keyboard-glide='falling'] & {
    animation: ${fall} var(--keyboard-glide-duration) ${EASING};
  }
`;
