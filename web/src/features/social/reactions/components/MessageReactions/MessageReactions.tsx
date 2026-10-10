import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import { useConversationScope } from '@/features/social/conversation/store';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import type { WorkspaceMember } from '@/features/workspaces/types';
import { Avatar } from '@/shared/ui/Avatar';

import { useReactionToggle } from '../../hooks/useReactionToggle';
import type { MessageReaction } from '../../types';

const MAX_FACES = 3;
const countFormat = new Intl.NumberFormat('uk-UA', { notation: 'compact' });

// A quiet fill of the theme; your own reaction is a soft tint of the primary colour with a
// thin outline of it, the way Discord marks it, never a solid block.
const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding-top: 2px;
  `,
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
  faces: css`
    display: inline-flex;
    margin-right: -6px;

    & > * {
      border-radius: 50%;
    }
    & > * + * {
      margin-left: -6px;
    }
  `,
}));

interface MessageReactionsProps {
  item: MessageHistoryItem;
  viewerMemberId: string | undefined;
  canReact: boolean;
  /** The message time, closing the row the way it closes the last line of text. */
  meta?: ReactNode;
}

export function MessageReactions({ item, viewerMemberId, canReact, meta }: MessageReactionsProps) {
  const { styles } = useStyles();
  const { workspaceId } = useConversationScope();
  const toggle = useReactionToggle(viewerMemberId);
  const members = useWorkspaceMembers(workspaceId).data;

  return (
    <div className={styles.row}>
      {item.reactions?.map((reaction) => {
        const faces = facesOf(reaction, members);

        return (
          <button
            key={reaction.emoji}
            type="button"
            className={styles.chip}
            aria-pressed={reaction.reacted}
            aria-label={chipLabel(reaction)}
            aria-disabled={!canReact || undefined}
            onClick={() => {
              if (canReact) toggle(item, reaction.emoji);
            }}
          >
            <span className={styles.emoji} aria-hidden="true">
              {reaction.emoji}
            </span>
            {faces ? (
              <span className={styles.faces} aria-hidden="true">
                {faces.map((member) => (
                  <Avatar
                    key={member.id}
                    path={member.profile.avatarPath}
                    alt={member.profile.displayName ?? ''}
                    size={22}
                    shape="circle"
                  />
                ))}
              </span>
            ) : (
              countFormat.format(reaction.count)
            )}
          </button>
        );
      })}
      {meta}
    </div>
  );
}

/** A few people read better as faces, once every one of them is known; more stay a number. */
function facesOf(reaction: MessageReaction, members: WorkspaceMember[] | undefined) {
  if (reaction.count > MAX_FACES || reaction.recentMemberIds.length !== reaction.count) return null;
  const faces = reaction.recentMemberIds.map((id) => members?.find((member) => member.id === id));
  return faces.every((member) => member !== undefined) ? faces : null;
}

function chipLabel({ emoji, count, reacted }: MessageReaction) {
  return reacted ? `${emoji} ${count}, ваша реакція` : `${emoji} ${count}`;
}
