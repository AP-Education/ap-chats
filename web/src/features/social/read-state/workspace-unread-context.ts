import { createContext, useContext } from 'react';

import {
  type Attention,
  combinedAttention,
  type ConversationAttention,
  conversationAttention,
} from './conversation-attention';
import type { ChannelUnread } from './hooks/useWorkspaceUnread';

export interface WorkspaceUnread {
  workspaceId: string;
  conversations: ChannelUnread[] | undefined;
}

export interface WorkspaceUnreadStore {
  /** The active workspace's channels and every direct conversation, by channel. */
  attentionByChannel: Map<string, ConversationAttention>;
  /** Each workspace's channels together, as its tile on the rail shows them. */
  channelsByWorkspace: Map<string, Attention>;
  /** Every workspace's channels: the team tab. */
  channels: Attention;
  /** Every direct conversation, whichever workspace it lives in. */
  direct: Attention;
}

export function createWorkspaceUnreadStore(
  activeWorkspaceId: string,
  workspaces: WorkspaceUnread[],
  mutedChannelIds: ReadonlySet<string>,
): WorkspaceUnreadStore {
  const attentionByChannel = new Map<string, ConversationAttention>();
  const channelsByWorkspace = new Map<string, Attention>();
  const direct: Attention[] = [];

  for (const { workspaceId, conversations = [] } of workspaces) {
    const isActive = workspaceId === activeWorkspaceId;
    const channels: Attention[] = [];

    for (const conversation of conversations) {
      const isDirect = conversation.kind === 'dm';
      const attention = conversationAttention(
        conversation,
        mutedChannelIds.has(conversation.channelId),
      );
      (isDirect ? direct : channels).push(attention);
      if (isActive || isDirect) attentionByChannel.set(conversation.channelId, attention);
    }

    channelsByWorkspace.set(workspaceId, combinedAttention(channels));
  }

  return {
    attentionByChannel,
    channelsByWorkspace,
    channels: combinedAttention(channelsByWorkspace.values()),
    direct: combinedAttention(direct),
  };
}

export const WorkspaceUnreadContext = createContext<WorkspaceUnreadStore | null>(null);

export function useWorkspaceUnreadStore(): WorkspaceUnreadStore {
  const value = useContext(WorkspaceUnreadContext);
  if (!value) {
    throw new Error('useWorkspaceUnreadStore must be used within WorkspaceUnreadContext.Provider');
  }
  return value;
}
