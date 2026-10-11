import { createStyles } from 'antd-style';

import type { MessageReaction } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  tabs: css`
    display: flex;
    gap: 6px;
    margin: 0 -4px 8px;
    padding: 0 4px 4px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `,
  tab: css`
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 16px;
    background: ${token.colorFillTertiary};
    color: ${token.colorText};
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    cursor: pointer;

    &[aria-selected='true'] {
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimaryTextActive};
    }
  `,
  // Opaque text colour: Chromium fades colour emoji by its alpha.
  emoji: css`
    color: ${token.colorTextBase};
    font-size: 18px;
    line-height: 1;
  `,
}));

interface ReactionTabsProps {
  reactions: MessageReaction[];
  total: number;
  /** The emoji in view, or undefined for everyone. */
  selected: string | undefined;
  onSelect: (emoji: string | undefined) => void;
}

export function ReactionTabs({ reactions, total, selected, onSelect }: ReactionTabsProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.tabs} role="tablist" aria-label="Реакції">
      <button
        type="button"
        role="tab"
        className={styles.tab}
        aria-selected={selected === undefined}
        onClick={() => onSelect(undefined)}
      >
        Усі {total}
      </button>
      {reactions.map(({ emoji, count }) => (
        <button
          key={emoji}
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={selected === emoji}
          aria-label={`${emoji} ${count}`}
          onClick={() => onSelect(emoji)}
        >
          <span className={styles.emoji} aria-hidden="true">
            {emoji}
          </span>
          {count}
        </button>
      ))}
    </div>
  );
}
