import { createStyles } from 'antd-style';

import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  // The stripe is its own pill inside the block, so it stays straight instead of
  // bending along the rounded corners.
  reply: css`
    --excerpt-accent: var(--bubble-accent);
    --excerpt-muted: var(--bubble-muted);
    position: relative;
    display: block;
    // A button only shrinks to fit, so it is stretched to the bubble; unlike width: 100%,
    // stretch keeps the inset a media bubble gives its captions.
    width: -webkit-fill-available;
    width: -moz-available;
    width: stretch;
    min-width: 0;
    padding: ${token.paddingXXS}px ${token.paddingXS}px ${token.paddingXXS}px ${token.padding}px;
    overflow: hidden;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: var(--excerpt-bg, color-mix(in srgb, var(--excerpt-accent) 12%, transparent));
    text-align: left;
    cursor: pointer;

    &::before {
      content: '';
      position: absolute;
      top: 6px;
      bottom: 6px;
      left: 6px;
      width: 4px;
      border-radius: ${token.borderRadiusXS}px;
      background: var(--excerpt-accent);
    }

    &:hover {
      background: var(
        --excerpt-bg-hover,
        color-mix(in srgb, var(--excerpt-accent) 18%, transparent)
      );
    }
  `,
}));

/** The message this one answers, as a tappable excerpt that jumps to it. */
export function ReplyReference({ onJump }: { onJump: (messageId: string) => void }) {
  const { styles } = useStyles();
  const { item } = useMessageActionScope();
  const reply = item.reply;

  if (!reply) return null;

  return (
    <button type="button" className={styles.reply} onClick={() => onJump(reply.id)}>
      <ReplyExcerpt
        title={reply.author?.displayName ?? 'Ім’я недоступне'}
        markdown={reply.markdown}
        quoteText={item.message.quoteText}
      />
    </button>
  );
}
