import { createStyles } from 'antd-style';

import type { WorkspaceMember } from '@/features/workspaces/types';

import { chipCount, chipLabel } from '../../reaction-display';
import type { MessageReaction } from '../../types';
import { ReactionFaces } from './ReactionFaces';

// A quiet fill of the theme; your own reaction is a soft tint of the primary colour with a
// thin outline of it, the way Discord marks it, never a solid block.
const useStyles = createStyles(({ token, css }) => ({
  chip: css`
    --chip-bg: ${token.colorFillSecondary};
    --chip-mine-bg: color-mix(in srgb, var(--chip-accent) 16%, transparent);
    --chip-accent: var(--bubble-accent);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px 0 8px;
    border: 1px solid transparent;
    border-radius: 16px;
    background: var(--chip-bg);
    color: var(--bubble-text);
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    cursor: pointer;
    transition:
      background-color 150ms ease-out,
      border-color 150ms ease-out,
      transform 100ms ease-out;
    -webkit-tap-highlight-color: transparent;

    // The bubble's accent is its primary tone, white on own bubbles, which then need a deeper wash.
    [data-side='own'] & {
      --chip-bg: rgba(255, 255, 255, 0.14);
      --chip-mine-bg: rgba(255, 255, 255, 0.24);
    }
    // Large emoji sit on the wallpaper without a bubble, in the page's own colours.
    [data-variant='emoji'] & {
      --chip-accent: ${token.colorPrimaryTextActive};
      color: ${token.colorText};
    }

    &[aria-pressed='true'] {
      border-color: color-mix(in srgb, var(--chip-accent) 55%, transparent);
      background: var(--chip-mine-bg);
      color: var(--chip-accent);
    }
    &[aria-disabled] {
      cursor: default;
    }
    &:focus-visible {
      outline: 2px solid var(--bubble-accent);
      outline-offset: 1px;
    }
    &:active:not([aria-disabled]) {
      transform: scale(0.96);
    }
  `,
  // Opaque text colour: Chromium fades colour emoji by its alpha.
  emoji: css`
    color: ${token.colorTextBase};
    font-size: 20px;
    line-height: 1;
  `,
}));

interface ReactionChipProps {
  reaction: MessageReaction;
  /** Shown instead of the count while only a few people reacted. */
  faces: WorkspaceMember[] | null;
  disabled: boolean;
  onToggle: () => void;
}

export function ReactionChip({ reaction, faces, disabled, onToggle }: ReactionChipProps) {
  const { styles } = useStyles();

  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={reaction.reacted}
      aria-label={chipLabel(reaction)}
      // Read-only chips stay focusable and announced instead of turning into disabled buttons.
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onToggle}
    >
      <span className={styles.emoji} aria-hidden="true">
        {reaction.emoji}
      </span>
      {faces ? <ReactionFaces faces={faces} /> : chipCount(reaction.count)}
    </button>
  );
}
