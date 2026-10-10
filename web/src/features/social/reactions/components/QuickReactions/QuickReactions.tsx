import { PlusIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { MessageHistoryItem } from '@/features/social/messaging/types';

import { useReactionToggle } from '../../hooks/useReactionToggle';
import { quickReactions } from '../../quick-reactions';

const useStyles = createStyles(({ token, css }) => ({
  // Above the context menu, as a pill of its own (Telegram desktop).
  menu: css`
    display: flex;
    gap: 2px;
    width: fit-content;
    margin-bottom: 8px;
    padding: 4px;
    border-radius: 999px;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
  `,
  // Across the top of the action sheet, spread to the edges (Discord mobile).
  sheet: css`
    display: flex;
    justify-content: space-between;
    padding: 0 4px 12px;
  `,
  option: css`
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    // Chromium paints colour emoji with the alpha of the text colour: an opaque one keeps them vivid.
    color: ${token.colorTextBase};
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    transition:
      transform 150ms ease-out,
      background-color 150ms ease-out;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: ${token.colorFillTertiary};
      transform: scale(1.12);
    }
    &[aria-pressed='true'] {
      background: ${token.colorPrimaryBg};
    }
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 1px;
    }

    [data-variant='sheet'] > & {
      width: 44px;
      height: 44px;
      background: ${token.colorFillTertiary};
      font-size: 24px;
    }
    [data-variant='sheet'] > &[aria-pressed='true'] {
      background: ${token.colorPrimaryBg};
    }
    [data-variant='sheet'] > &:hover {
      transform: none;
    }
  `,
  more: css`
    color: ${token.colorTextSecondary};
  `,
}));

interface QuickReactionsProps {
  item: MessageHistoryItem;
  viewerMemberId: string | undefined;
  variant: 'menu' | 'sheet';
  /** Called once a reaction is picked, so the surface around the row can close. */
  onPicked: () => void;
  onMore: () => void;
}

export function QuickReactions({
  item,
  viewerMemberId,
  variant,
  onPicked,
  onMore,
}: QuickReactionsProps) {
  const { styles, cx } = useStyles();
  const toggle = useReactionToggle(viewerMemberId);
  const [emojis] = useState(quickReactions);
  const reacted = new Set(
    item.reactions?.filter((reaction) => reaction.reacted).map((reaction) => reaction.emoji),
  );

  return (
    <div
      role="toolbar"
      aria-label="Реакції"
      data-variant={variant}
      className={variant === 'menu' ? styles.menu : styles.sheet}
    >
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={styles.option}
          aria-label={`Реакція ${emoji}`}
          aria-pressed={reacted.has(emoji)}
          onClick={() => {
            toggle(item, emoji);
            onPicked();
          }}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        className={cx(styles.option, styles.more)}
        aria-label="Інші реакції"
        onClick={onMore}
      >
        <PlusIcon size={variant === 'menu' ? 18 : 20} />
      </button>
    </div>
  );
}
