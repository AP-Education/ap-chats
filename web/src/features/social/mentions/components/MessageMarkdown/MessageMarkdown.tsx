import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';

import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import { ChannelReference } from './ChannelReference';
import { mentionDirective } from './mention-directive';
import { MentionChipText, useMentionChipStyles } from './MentionChip';

export interface MentionLabel {
  memberId: string;
  displayName: string | null;
  avatarPath?: string | null;
}

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
  const { styles, cx } = useMentionChipStyles();
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
          if (node?.properties?.['data-mention'] === 'everyone')
            return (
              <span className={styles.mention}>
                <MentionChipText>@everyone</MentionChipText>
              </span>
            );

          const channelId = node?.properties?.['data-channel-id'];
          if (typeof channelId === 'string')
            return <ChannelReference channelId={channelId} inline={inline} />;

          const memberId = String(node?.properties?.['data-member-id'] ?? '');
          if (!memberId) return <span>{children}</span>;
          const person = people.get(memberId);
          const name = person?.displayName ?? 'учасник';
          const isMe = memberId === viewerMemberId;
          const mentionClass = cx(styles.mention, isMe && styles.mentionMe);
          if (inline || !person)
            return (
              <span className={mentionClass}>
                <MentionChipText>@{name}</MentionChipText>
              </span>
            );
          return (
            <MemberProfileTrigger
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
                <MentionChipText>@{name}</MentionChipText>
              </button>
            </MemberProfileTrigger>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
