import { avatarColors } from '@ap-education/ui';
import { theme } from 'antd';
import { createStyles } from 'antd-style';

import { BotBadge } from '@/features/social/people/components/BotBadge/BotBadge';
import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';

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

/** Who wrote an incoming message, in the colour of their avatar. */
export function MessageAuthorName() {
  const { styles } = useStyles();
  const { item, author, context } = useMessageActionScope();
  const { token } = theme.useToken();

  if (item.message.authorMemberId === context.memberId) return null;

  return (
    <span className={styles.line}>
      <MemberPopover member={item.author}>
        <button
          type="button"
          className={styles.author}
          style={{ color: avatarColors(author, token).name }}
        >
          {author}
        </button>
      </MemberPopover>
      {item.author.isBot && <BotBadge />}
    </span>
  );
}
