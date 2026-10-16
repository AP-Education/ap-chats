import type { ReactNode } from 'react';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';

import { useReactionToggle } from '../../hooks/useReactionToggle';
import { chipFaces } from '../../reaction-display';
import styles from './MessageReactions.module.css';
import { ReactionChip } from './ReactionChip';

interface MessageReactionsProps {
  item: MessageHistoryItem;
  viewerMemberId: string | undefined;
  canReact: boolean;
  /** The message time, closing the row the way it closes the last line of text. */
  meta?: ReactNode;
}

export function MessageReactions({ item, viewerMemberId, canReact, meta }: MessageReactionsProps) {
  const { workspaceId } = useConversationScope();
  const toggle = useReactionToggle(viewerMemberId);
  const members = useWorkspaceMembers(workspaceId).data ?? [];
  const findMember = (memberId: string) => members.find((member) => member.id === memberId);

  return (
    <div className={styles.row}>
      {item.reactions?.map((reaction) => (
        <ReactionChip
          key={reaction.emoji}
          reaction={reaction}
          faces={chipFaces(reaction, findMember)}
          disabled={!canReact}
          onToggle={() => toggle(item, reaction.emoji)}
        />
      ))}
      {meta}
    </div>
  );
}
