import { createStyles } from 'antd-style';
import type { CSSProperties } from 'react';

import { ForwardIcon } from '@/features/social/conversation/actionIcons';
import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';
import { getAvatarColor } from '@/shared/ui/Avatar/utils/color';

import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ css }) => ({
  author: css`
    display: block;
    max-width: 100%;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    color: var(--author-color);
    font: inherit;
    font-size: 14px;
    line-height: 18px;
    font-weight: 650;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
  forwarded: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    color: var(--bubble-accent);
    font-size: 14px;
    line-height: 18px;
  `,
  forwardedName: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
  reply: css`
    --excerpt-accent: var(--bubble-accent);
    --excerpt-muted: var(--bubble-muted);
    display: block;
    width: 100%;
    min-width: 0;
    padding: 4px 8px 5px 11px;
    overflow: hidden;
    border: 0;
    border-radius: 6px;
    background: color-mix(in srgb, var(--excerpt-accent) 12%, transparent);
    box-shadow: inset 3px 0 0 var(--excerpt-accent);
    text-align: left;
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--excerpt-accent) 18%, transparent);
    }
  `,
}));

interface MessageHeaderProps {
  own: boolean;
  showAuthor: boolean;
  onJump: (messageId: string) => void;
}

// Own bubbles keep a single accent; in others names and replies take the author's colour.
export function MessageHeader({ own, showAuthor, onJump }: MessageHeaderProps) {
  const { styles } = useStyles();
  const { item, author } = useMessageActionScope();
  const reply = item.reply;
  const replyAuthorName = reply?.author?.displayName ?? 'Ім’я недоступне';
  const forwardAuthorName = item.forwardedFrom?.displayName ?? 'Ім’я недоступне';

  return (
    <>
      {showAuthor && (
        <MemberPopover member={item.author}>
          <button
            type="button"
            className={styles.author}
            style={{ '--author-color': getAvatarColor(author).text } as CSSProperties}
          >
            {author}
          </button>
        </MemberPopover>
      )}
      {item.message.isForwarded && (
        <div className={styles.forwarded}>
          <ForwardIcon size={14} aria-hidden />
          <span>
            Переслано від{' '}
            {item.forwardedFrom ? (
              <MemberPopover member={item.forwardedFrom}>
                <button type="button" className={styles.forwardedName}>
                  {forwardAuthorName}
                </button>
              </MemberPopover>
            ) : (
              forwardAuthorName
            )}
          </span>
        </div>
      )}
      {reply && (
        <button
          type="button"
          className={styles.reply}
          style={
            own
              ? undefined
              : ({ '--excerpt-accent': getAvatarColor(replyAuthorName).text } as CSSProperties)
          }
          onClick={() => onJump(reply.id)}
        >
          <ReplyExcerpt
            title={replyAuthorName}
            markdown={reply.markdown}
            quoteText={item.message.quoteText}
          />
        </button>
      )}
    </>
  );
}
