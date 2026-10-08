import { createStyles } from 'antd-style';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';

import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';

import { mentionDirective } from './mention-directive';

export interface MentionLabel {
  memberId: string;
  displayName: string | null;
  avatarPath?: string | null;
}

const useStyles = createStyles(({ token, css }) => ({
  // Hugs the glyphs instead of filling the line: a button would otherwise stretch its
  // tint to the full line box and read as a block in the middle of the sentence.
  mention: css`
    display: inline;
    padding: 1px 4px;
    border: 0;
    border-radius: ${token.borderRadiusSM}px;
    background: var(--mention-bg, ${token.colorPrimaryBg});
    color: var(--mention-color, ${token.colorPrimaryTextActive});
    font: inherit;
    font-weight: 600;
    line-height: 1.2;
    vertical-align: baseline;
    box-decoration-break: clone;
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
  mentionMeTrigger: css`
    &:hover,
    &:focus-visible {
      background: var(--mention-me-bg-hover, rgba(250, 173, 20, 0.28));
    }
  `,
}));

interface MessageMarkdownProps {
  markdown: string;
  mentions?: MentionLabel[];
  inline?: boolean;
  /** The current viewer's own member id — highlights a mention of them distinctly. */
  viewerMemberId?: string;
}

export function MessageMarkdown({
  markdown,
  mentions = [],
  inline = false,
  viewerMemberId,
}: MessageMarkdownProps) {
  const { styles, cx } = useStyles();
  const people = new Map(mentions.map((mention) => [mention.memberId, mention]));

  return (
    <ReactMarkdown
      remarkPlugins={[remarkDirective, mentionDirective, remarkBreaks]}
      allowedElements={[
        'p',
        'strong',
        'em',
        'code',
        'pre',
        'a',
        'blockquote',
        'ul',
        'ol',
        'li',
        'br',
        'span',
      ]}
      unwrapDisallowed={inline}
      components={{
        p: ({ children }) => (inline ? <span>{children} </span> : <p>{children}</p>),
        a: ({ children, ...props }) =>
          inline ? (
            <span>{children}</span>
          ) : (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.stopPropagation()}
            >
              {children}
            </a>
          ),
        br: () => (inline ? <> </> : <br />),
        span: ({ node, children }) => {
          const memberId = String(node?.properties?.['data-member-id'] ?? '');
          if (!memberId) return <span>{children}</span>;
          const person = people.get(memberId);
          const name = person?.displayName ?? 'учасник';
          const isMe = memberId === viewerMemberId;
          const mentionClass = cx(styles.mention, isMe && styles.mentionMe);
          if (inline || !person) return <span className={mentionClass}>@{name}</span>;
          return (
            <MemberPopover
              member={{
                memberId,
                displayName: person.displayName,
                avatarPath: person.avatarPath ?? null,
              }}
            >
              <button
                type="button"
                className={cx(mentionClass, styles.mentionTrigger, isMe && styles.mentionMeTrigger)}
                onPointerDown={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.stopPropagation()}
              >
                @{name}
              </button>
            </MemberPopover>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
