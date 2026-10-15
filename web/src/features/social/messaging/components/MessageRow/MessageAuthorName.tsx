import { createStyles } from 'antd-style';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import { BotBadge } from '@/features/social/people/components/BotBadge/BotBadge';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  // Only the first bubble of a run names its author (HistoryRun hides the rest).
  line: css`
    display: var(--run-author, flex);
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  author: css`
    display: block;
    max-width: 100%;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    line-height: 1.3;
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
}));

/** Who wrote an incoming message, in the colour of their top role. */
export function MessageAuthorName() {
  const { styles } = useStyles();
  const { item, author, context } = useMessageActionScope();
  const { workspaceId } = useConversationScope();

  if (item.message.authorMemberId === context.memberId) return null;

  return (
    <span className={styles.line}>
      <MemberProfileTrigger member={{ ...item.author, workspaceId }}>
        <button
          type="button"
          className={styles.author}
          style={item.author.roleColor ? { color: item.author.roleColor } : undefined}
        >
          {author}
        </button>
      </MemberProfileTrigger>
      {item.author.isBot && <BotBadge />}
    </span>
  );
}
