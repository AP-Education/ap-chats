import { createContext, useContext } from 'react';

import type { ConversationNotify } from '@/features/communities/notifications/types';

import {
  type Attention,
  combinedAttention,
  conversationAttention,
  notifyOf,
} from './conversation-attention';
import type { ChannelUnread } from './hooks/useWorkspaceUnread';

/** A workspace's conversations with what each of them tells the person about. */
export interface WorkspaceReadState {
  conversations: ChannelUnread[] | undefined;
  notifyByChannel: ReadonlyMap<string, ConversationNotify> | undefined;
}

export interface WorkspaceUnreadStore {
  /** The active workspace's channels and every direct conversation, by channel. */
  attentionByChannel: Map<string, Attention>;
  /** The active workspace's channels. */
  channels: Attention;
  /** The other workspaces' channels. */
  channelsElsewhere: Attention;
  /** Every direct conversation, whichever workspace it lives in. */
  direct: Attention;
}

export function createWorkspaceUnreadStore(
  active: WorkspaceReadState,
  elsewhere: WorkspaceReadState[],
): WorkspaceUnreadStore {
  const attentionByChannel = new Map<string, Attention>();
  const channels: Attention[] = [];
  const channelsElsewhere: Attention[] = [];
  const direct: Attention[] = [];

  for (const workspace of [active, ...elsewhere]) {
    const isActive = workspace === active;
    for (const conversation of workspace.conversations ?? []) {
      const attention = conversationAttention(
        conversation,
        notifyOf(conversation, workspace.notifyByChannel),
      );
      if (conversation.kind === 'dm') direct.push(attention);
      else (isActive ? channels : channelsElsewhere).push(attention);
      if (isActive || conversation.kind === 'dm') {
        attentionByChannel.set(conversation.channelId, attention);
      }
    }
  }

  return {
    attentionByChannel,
    channels: combinedAttention(channels),
    channelsElsewhere: combinedAttention(channelsElsewhere),
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
