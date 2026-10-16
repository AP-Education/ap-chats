import { useConversationScope } from '@/features/social/conversation-scope/store';
import { BotBadge } from '@/features/social/people/components/BotBadge/BotBadge';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageAuthorName.module.css';

/** Who wrote an incoming message, in the colour of their top role. */
export function MessageAuthorName() {
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
