import { createStyles } from 'antd-style';
import type { PropsWithChildren } from 'react';

export const useMentionChipStyles = createStyles(({ token, css }) => ({
  // One line whatever the name, and the same box whichever element carries it: a button
  // never flows like text, so a long name would otherwise grow into a block mid-sentence.
  mention: css`
    display: inline-flex;
    box-sizing: border-box;
    max-width: 100%;
    padding: 1px 4px;
    border: 0;
    border-radius: ${token.borderRadiusSM}px;
    background: var(--mention-bg, ${token.colorPrimaryBg});
    color: var(--mention-color, ${token.colorPrimaryTextActive});
    font: inherit;
    font-weight: 600;
    line-height: 1.2;
    vertical-align: baseline;
  `,
  mentionText: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  mentionTrigger: css`
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: var(--mention-bg-hover, ${token.colorPrimaryBgHover});
    }
  `,
  // A mention of you specifically reads differently from a mention of
  // anyone else — Discord's amber "this is about you" tag. The same accent
  // as the row highlight, deliberately not antd's stock warning tokens,
  // which read as a random clash against this app's teal palette.
  // Own bubbles override these with their usual mention ink: naming yourself in your
  // own message is no news to you, and amber on the accent fill reads as mud.
  mentionMe: css`
    background: var(--mention-me-bg, rgba(250, 173, 20, 0.18));
    color: var(--mention-me-color, #874d00);

    html[data-theme='dark'] & {
      background: var(--mention-me-bg, rgba(250, 173, 20, 0.22));
      color: var(--mention-me-color, #ffd591);
    }
  `,
  // A role reads in its own color, as on Discord; own bubbles keep their mention ink instead.
  mentionRole: css`
    background: var(--mention-role-bg, color-mix(in srgb, var(--role-color) 18%, transparent));
    color: var(--mention-role-color, var(--role-color));
  `,
  // A bot here is an assistant: its mention carries a faint indigo-to-violet wash, hover
  // included. The spark's teal end is left out, since it would vanish into the teal accent.
  mentionAssistant: css`
    &&& {
      background-image: linear-gradient(100deg, rgb(84 104 245 / 0.38), rgb(168 85 247 / 0.38));
    }
  `,
  mentionMeTrigger: css`
    &:hover,
    &:focus-visible {
      background: var(--mention-me-bg-hover, rgba(250, 173, 20, 0.28));
    }
  `,
}));

/** A chip's text in a box of its own, so a name too long for the line ends in an ellipsis. */
export function MentionChipText({ children }: PropsWithChildren) {
  const { styles } = useMentionChipStyles();
  return <span className={styles.mentionText}>{children}</span>;
}
