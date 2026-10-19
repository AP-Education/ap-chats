import { createContext, type ReactNode, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';

import { reachesViewer, type ViewerReach } from '../../mention-reach';
import { tokenFromAttributes } from '../../mention-tokens';
import type { MentionLabel } from '../../types';
import { withoutLinkEscapes } from './link-escapes';
import { mentionDirective } from './mention-directive';
import { MentionReference } from './MentionReference';

interface MessageMarkdownProps {
  markdown: string;
  mentions?: MentionLabel[];
  inline?: boolean;
  /** How the message reached the viewer, so the references that did read as theirs. */
  viewer?: ViewerReach;
}

interface MarkdownScope {
  inline: boolean;
  people: Map<string, MentionLabel>;
  viewer?: ViewerReach;
}

const MarkdownScopeContext = createContext<MarkdownScope>({ inline: false, people: new Map() });

const BLOCKS = ['pre', 'blockquote', 'ul', 'ol', 'li'];
const ELEMENTS = ['p', 'strong', 'em', 'code', 'a', 'img', 'br', 'span', 'del', ...BLOCKS];
// A preview is one line: blocks give way to their text, the breaks between them read as spaces.
const INLINE_ELEMENTS = ELEMENTS.filter((tag) => !BLOCKS.includes(tag));

// A link the sanitizer emptied, such as javascript:, keeps only its label.
function MarkdownLink({
  href,
  title,
  children,
}: {
  href?: string;
  title?: string;
  children: ReactNode;
}) {
  const { inline } = useContext(MarkdownScopeContext);
  if (inline || !href) return <span>{children}</span>;
  return (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}

// Element views live outside the render: a fresh function per render is a new component type,
// which remounts the text and drops any selection the reader is making in it.
const components: Components = {
  p: function Paragraph({ children }) {
    const { inline } = useContext(MarkdownScopeContext);
    return inline ? <span>{children} </span> : <p>{children}</p>;
  },
  a: ({ children, href, title }) => (
    <MarkdownLink href={href} title={title}>
      {children}
    </MarkdownLink>
  ),
  // Chat shows no inline images; one typed in Markdown reads as a link to it.
  img: ({ src, alt }) => (
    <MarkdownLink href={typeof src === 'string' ? src : undefined}>{alt || src}</MarkdownLink>
  ),
  br: function Break() {
    const { inline } = useContext(MarkdownScopeContext);
    return inline ? <> </> : <br />;
  },
  span: function Reference({ node, children }): ReactNode {
    const { inline, people, viewer } = useContext(MarkdownScopeContext);
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
};

export function MessageMarkdown({
  markdown,
  mentions = [],
  inline = false,
  viewer,
}: MessageMarkdownProps) {
  const people = new Map(mentions.map((mention) => [mention.memberId, mention]));

  return (
    <MarkdownScopeContext.Provider value={{ inline, people, viewer }}>
      <ReactMarkdown
        // GFM for bare links and ~~strikethrough~~; a single tilde stays plain, as people type it.
        remarkPlugins={[
          remarkDirective,
          mentionDirective,
          remarkBreaks,
          [remarkGfm, { singleTilde: false }],
        ]}
        allowedElements={inline ? INLINE_ELEMENTS : ELEMENTS}
        // Whatever has no look of its own here, a table or a heading, still shows its text.
        unwrapDisallowed
        components={components}
      >
        {withoutLinkEscapes(markdown)}
      </ReactMarkdown>
    </MarkdownScopeContext.Provider>
  );
}
