import { createStyles, keyframes } from 'antd-style';

const pulse = keyframes`
  50% { opacity: var(--pulse-low); }
`;

const BUBBLES = [
  { own: false, width: 58, lines: 2 },
  { own: false, width: 36, lines: 1 },
  { own: true, width: 48, lines: 1 },
  { own: false, width: 66, lines: 3 },
  { own: true, width: 40, lines: 2 },
  { own: true, width: 28, lines: 1 },
  { own: false, width: 52, lines: 1 },
];

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: flex-end;
    gap: 6px;
    min-height: 0;
    overflow: hidden;
    padding: 16px 12px;
  `,
  bubble: css`
    max-width: 560px;
    border-radius: 18px;
    background: var(--chat-incoming-bg, ${token.colorFillSecondary});
    --pulse-low: 0.4;
    opacity: 0.75;
    animation: ${pulse} 1.6s ease-in-out infinite;

    &[data-own='true'] {
      align-self: flex-end;
      background: var(--chat-own-from, ${token.colorPrimary});
      --pulse-low: 0.2;
      opacity: 0.45;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
}));

/** The shape of a conversation while its first messages load. */
export function ConversationHistorySkeleton() {
  const { styles } = useStyles();

  return (
    <div className={styles.root} role="status" aria-label="Завантажуємо повідомлення">
      {BUBBLES.map((bubble, index) => (
        <span
          key={index}
          className={styles.bubble}
          data-own={bubble.own}
          style={{ width: `${bubble.width}%`, height: 16 + bubble.lines * 20 }}
        />
      ))}
    </div>
  );
}
