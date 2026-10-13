import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';

import { reachesViewer, type ViewerReach } from '../../mention-reach';
import { tokenFromAttributes } from '../../mention-tokens';
import type { MentionLabel } from '../../types';
import { mentionDirective } from './mention-directive';
import { MentionReference } from './MentionReference';

interface MessageMarkdownProps {
  markdown: string;
  mentions?: MentionLabel[];
  inline?: boolean;
  /** How the message reached the viewer, so the references that did read as theirs. */
  viewer?: ViewerReach;
}

export function MessageMarkdown({
  markdown,
  mentions = [],
  inline = false,
  viewer,
}: MessageMarkdownProps) {
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
          const token = tokenFromAttributes(node?.properties);
          if (!token) return <span>{children}</span>;
          return (
            <MentionReference
              token={token}
              people={people}
              inline={inline}
              mine={reachesViewer(token, viewer)}
            />
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
