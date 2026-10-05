import { createStyles } from 'antd-style';
import type { RefObject } from 'react';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';

import { useMessageActionScope } from './MessageActionScope';

// One grapheme only — a pictographic run joined by ZWJ (so a family/profession
// emoji still counts as one) or a flag's pair of regional indicators. Two
// separate emoji side by side, or any other text, fails this.
const SINGLE_EMOJI_PATTERN = new RegExp(
  '^(?:\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?' +
    '(?:\\u200D\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?)*' +
    '|\\p{Regional_Indicator}\\p{Regional_Indicator})$',
  'u',
);

const useStyles = createStyles(({ token, css }) => ({
  markdown: css`
    font-size: ${token.fontSize}px;
    line-height: 1.5;
    user-select: text;
    p {
      margin: 0 0 5px;
    }
    p:last-child {
      margin-bottom: 0;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: 9px 11px;
      border-radius: 7px;
      background: ${token.colorFillTertiary};
    }
    code {
      padding: 1px 3px;
      border-radius: 3px;
      background: ${token.colorFillTertiary};
      font-size: 0.92em;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin: 5px 0;
      padding-left: 9px;
      border-left: 3px solid ${token.colorBorder};
      color: ${token.colorTextSecondary};
    }
    ul,
    ol {
      margin: 5px 0;
      padding-left: 21px;
    }
    a {
      color: ${token.colorLink};
    }
  `,
  jumboEmoji: css`
    font-size: 48px;
    line-height: 1.2;
    p {
      margin: 0;
    }
  `,
}));

export function MessageReadContent({
  contentRef,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  const { styles, cx } = useStyles();
  const { item, context } = useMessageActionScope();

  if (item.message.markdown === null) {
    return null;
  }

  const isSingleEmoji = SINGLE_EMOJI_PATTERN.test(item.message.markdown.trim());

  return (
    <div
      ref={contentRef}
      className={cx(styles.markdown, isSingleEmoji && styles.jumboEmoji)}
      data-message-text
    >
      <MessageMarkdown
        markdown={item.message.markdown}
        mentions={item.mentions}
        viewerMemberId={context.memberId}
      />
    </div>
  );
}
