import { type ComponentType, createContext, useContext } from 'react';

import type { Message, MessageHistoryItem, SendMessageCommand } from '../messaging/types';
import type { ConversationAction } from './actions';

/** A message the person sent from the composer, and what they composed it as. */
export interface SentMessage {
  channelId: string;
  input: Omit<SendMessageCommand, 'attachments'>;
  /** The messages an `ask` intent picked. */
  picked?: string[];
  /** Who wrote the message it replies to. */
  replyToAuthorId?: string;
  /** Resolves once the server holds the message. */
  landed: Promise<Message>;
}

/** What a feature is given to show its own part of a message. */
export interface MessageAddonProps {
  item: MessageHistoryItem;
  onJump: (messageId: string) => void;
}

/** What a feature adds to a conversation, declared by the page that composes it. */
export interface ConversationExtension {
  id: string;
  /** Message actions, offered after the built-in ones. */
  actions?: ConversationAction[];
  /** The feature's own part of a message, shown in its bubble above the text. */
  MessageAddon?: ComponentType<MessageAddonProps>;
  /** Shown after the last message, where what happens next appears. */
  TimelineEnd?: ComponentType;
  /** Hears of every message the person sends. */
  sent?: (message: SentMessage) => void;
}

export const ConversationExtensionsContext = createContext<readonly ConversationExtension[]>([]);

export function useConversationExtensions(): readonly ConversationExtension[] {
  return useContext(ConversationExtensionsContext);
}
