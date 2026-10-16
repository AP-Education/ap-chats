import { useNavigate } from 'react-router-dom';

import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { MentionChipText } from './MentionChip';
import styles from './MentionChip.module.css';

interface ChannelReferenceProps {
  channelId: string;
  inline: boolean;
}

/** A channel named in a message: opens it for anyone who can see it, plain text otherwise. */
export function ChannelReference({ channelId, inline }: ChannelReferenceProps) {
  const navigate = useNavigate();
  const { workspaceId } = useConversationScope();
  const channels = useChannels(workspaceId);
  const channel = channels.data?.find((item) => item.id === channelId);
  const name = channel ? `#${channel.name}` : '#недоступний канал';

  if (!channel || inline)
    return (
      <span className={styles.mention}>
        <MentionChipText>{name}</MentionChipText>
      </span>
    );

  // A button like a member mention, so the bubble's link styling never reaches it.
  return (
    <button
      type="button"
      className={styles.mention}
      onClick={() => navigate(`/channels/${channel.id}`)}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <MentionChipText>{name}</MentionChipText>
    </button>
  );
}
