import { createStyles } from 'antd-style';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';

import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';

import { mentionDirective } from './mention-directive';

export interface MentionLabel {
  memberId: string;
  displayName: string | null;
  avatarPath?: string | null;
}

const useStyles = createStyles(({ token, css }) => ({
  mention: css`
    padding: 0 2px;
    border: 0;
    border-radius: 2px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    font: inherit;
    font-weight: 500;
  `,
  mentionTrigger: css`
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: ${token.colorPrimaryBgHover};
    }
  `,
}));

interface MessageMarkdownProps {
  markdown: string;
  mentions?: MentionLabel[];
  inline?: boolean;
}

export function MessageMarkdown({ markdown, mentions = [], inline = false }: MessageMarkdownProps) {
  const { styles, cx } = useStyles();
  const people = new Map(mentions.map((mention) => [mention.memberId, mention]));

  return (
    <ReactMarkdown
      remarkPlugins={[remarkDirective, mentionDirective]}
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
            <a {...props} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        br: () => (inline ? <> </> : <br />),
        span: ({ node, children }) => {
          const memberId = String(node?.properties?.['data-member-id'] ?? '');
          if (!memberId) return <span>{children}</span>;
          const person = people.get(memberId);
          const name = person?.displayName ?? 'учасник';
          if (inline || !person) return <span className={styles.mention}>@{name}</span>;
          return (
            <MemberPopover
              member={{
                memberId,
                displayName: person.displayName,
                avatarPath: person.avatarPath ?? null,
              }}
            >
              <button type="button" className={cx(styles.mention, styles.mentionTrigger)}>
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
