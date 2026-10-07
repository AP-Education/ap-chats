import { createStyles } from 'antd-style';
import type { ReactNode, RefObject } from 'react';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';

import { isSingleEmoji } from './bubbleLayout';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ css }) => ({
  markdown: css`
    display: flow-root;
    font-size: 16px;
    line-height: 1.35;
    user-select: text;
    p {
      margin: 0 0 5px;
    }
    // The last paragraph flows inline so the floated time can share its last line.
    & > p:nth-last-child(2) {
      display: inline;
    }
    pre {
      margin: 4px 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--bubble-fill);
    }
    code {
      padding: 1px 4px;
      border-radius: 4px;
      background: var(--bubble-fill);
      font-size: 0.9em;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin: 4px 0;
      padding-left: 10px;
      border-left: 3px solid var(--bubble-accent);
      color: var(--bubble-muted);
    }
    ul,
    ol {
      margin: 4px 0;
      padding-left: 22px;
    }
    a {
      color: var(--bubble-link);
      text-decoration: underline;
      text-decoration-thickness: from-font;
      text-underline-offset: 2px;
    }
  `,
  jumboEmoji: css`
    font-size: 56px;
    line-height: 1.15;
    p {
      margin: 0;
    }
  `,
}));

export function MessageReadContent({
  contentRef,
  meta,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
  meta: ReactNode;
}) {
  const { styles, cx } = useStyles();
  const { item, context } = useMessageActionScope();

  if (item.message.markdown === null) {
    return null;
  }

  return (
    <div
      ref={contentRef}
      className={cx(styles.markdown, isSingleEmoji(item.message.markdown) && styles.jumboEmoji)}
      data-message-text
    >
      <MessageMarkdown
        markdown={item.message.markdown}
        mentions={item.mentions}
        viewerMemberId={context.memberId}
      />
      {meta}
    </div>
  );
}
