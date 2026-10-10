import { avatarColors } from '@ap-education/ui';
import { theme } from 'antd';
import { createStyles } from 'antd-style';

import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  // Only the first bubble of a run names its author (HistoryRun hides the rest).
  author: css`
    display: var(--run-author, block);
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
    <MemberProfileTrigger member={item.author}>
      <button
        type="button"
        className={styles.author}
        style={{ color: avatarColors(author, token).name }}
      >
        {author}
      </button>
    </MemberProfileTrigger>
  );
}
