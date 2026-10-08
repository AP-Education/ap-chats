import { createStyles } from 'antd-style';
import type { ReactNode, RefObject } from 'react';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';

import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  // The composer's own rhythm, so a message keeps its shape once sent. Unitless, so the
  // spacing follows any text size or WCAG text-spacing override instead of clipping.
  markdown: css`
    display: flow-root;
    font-size: 16px;
    line-height: 1.45;
    text-wrap: pretty;
    user-select: text;
    p {
      margin: 0 0 0.6em;
    }
    // The last paragraph flows inline so the floated time can share its last line.
    & > p:nth-last-child(2) {
      display: inline;
    }
    pre {
      margin: 0.4em 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: ${token.paddingXS}px 10px;
      border-radius: ${token.borderRadius}px;
      background: var(--bubble-fill);
      line-height: 1.5;
      tab-size: 2;
    }
    code {
      padding: 0.1em 0.3em;
      border-radius: ${token.borderRadiusSM}px;
      background: var(--bubble-fill);
      font-family: ${token.fontFamilyCode};
      font-size: 0.875em;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin: 0.4em 0;
      padding-left: 10px;
      border-left: 4px solid var(--bubble-accent);
      color: var(--bubble-muted);
    }
    ul,
    ol {
      margin: 0.4em 0;
      padding-left: 1.4em;
    }
    li + li {
      margin-top: 0.15em;
    }
    a {
      color: var(--bubble-link);
      text-decoration: underline;
      text-decoration-thickness: from-font;
      text-underline-offset: 0.15em;
    }
  `,
  // One emoji largest, two or three a step smaller, like the big emoji of messengers.
  jumboEmoji: css`
    position: relative;
    display: inline-block;
    padding-bottom: 6px;
    font-size: 108px;
    line-height: 1.1;
    letter-spacing: 0.03em;
    p {
      margin: 0;
    }
    &[data-jumbo='2'] {
      font-size: 90px;
    }
    &[data-jumbo='3'] {
      font-size: 75px;
    }
  `,
}));

export function MessageReadContent({
  contentRef,
  jumboEmoji,
  meta,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
  jumboEmoji: number;
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
      className={cx(styles.markdown, jumboEmoji > 0 && styles.jumboEmoji)}
      data-jumbo={jumboEmoji || undefined}
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
