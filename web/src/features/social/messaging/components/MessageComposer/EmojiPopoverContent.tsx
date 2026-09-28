import { createStyles } from 'antd-style';

import { COMMON_EMOJIS } from './emoji-data';

const useStyles = createStyles(({ token, css }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    width: 240px;
  `,
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    font-size: 18px;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
}));

interface EmojiPopoverContentProps {
  onPick: (emoji: string) => void;
}

export function EmojiPopoverContent({ onPick }: EmojiPopoverContentProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.grid}>
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={styles.button}
          aria-label={emoji}
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
