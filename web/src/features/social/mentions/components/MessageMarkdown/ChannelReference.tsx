import { createStyles } from 'antd-style';
import { Link } from 'react-router-dom';

import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import { useConversationScope } from '@/features/social/conversation/store';

const useStyles = createStyles(({ css }) => ({
  link: css`
    text-decoration: none;
  `,
}));

interface ChannelReferenceProps {
  channelId: string;
  inline: boolean;
  className: string;
}

/** A channel named in a message: a link for anyone who can see it, plain text otherwise. */
export function ChannelReference({ channelId, inline, className }: ChannelReferenceProps) {
  const { styles, cx } = useStyles();
  const { workspaceId } = useConversationScope();
  const channels = useChannels(workspaceId);
  const channel = channels.data?.find((item) => item.id === channelId);

  if (!channel) return <span className={className}>#недоступний канал</span>;
  if (inline) return <span className={className}>#{channel.name}</span>;

  return (
    <Link
      to={`/channels/${channel.id}`}
      className={cx(className, styles.link)}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      #{channel.name}
    </Link>
  );
}
