import type { WorkspaceMember } from '@/features/workspaces/types';

import { chipCount, chipLabel } from '../../reaction-display';
import type { MessageReaction } from '../../types';
import styles from './ReactionChip.module.css';
import { ReactionFaces } from './ReactionFaces';

interface ReactionChipProps {
  reaction: MessageReaction;
  /** Shown instead of the count while only a few people reacted. */
  faces: WorkspaceMember[] | null;
  disabled: boolean;
  onToggle: () => void;
}

export function ReactionChip({ reaction, faces, disabled, onToggle }: ReactionChipProps) {
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
