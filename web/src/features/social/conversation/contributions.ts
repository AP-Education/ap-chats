import { type ComponentType, useEffect } from 'react';

import type { Message, MessageHistoryItem, SendMessageCommand } from '../messaging/types';
import type { ConversationAction } from './actions';
import { useConversation } from './store';

/** A message the person sent from the composer, with what they composed it as. */
export interface ComposedMessage {
  input: Omit<SendMessageCommand, 'attachments'>;
  /** The messages an `ask` intent picked. */
  picked?: string[];
  /** Who wrote the message it replies to. */
  replyToAuthorId?: string;
}

/** What a feature is given to show its own part of a message. */
export interface MessageAddonProps {
  item: MessageHistoryItem;
  onJump: (messageId: string) => void;
}

/** What a feature adds to the conversations it is mounted in, on its own terms. */
export interface ConversationContribution {
  actions?: ConversationAction[];
  /** The feature's own part of a message, shown in its bubble above the text. */
  MessageAddon?: ComponentType<MessageAddonProps>;
  /** Hears of a message the person sent, and of the moment it lands. */
  sent?: (message: ComposedMessage, landed: Promise<Message>) => void;
}

/** Adds to the conversation for as long as the caller is mounted; keep the object stable. */
export function useConversationContribution(contribution: ConversationContribution): void {
  const contribute = useConversation((state) => state.contribute);

  useEffect(() => contribute(contribution), [contribute, contribution]);
}

/** Where a feature portals what happens next, after the conversation's last message. */
export function useConversationTimelineEnd(): HTMLElement | null {
  return useConversation((state) => state.timelineEnd);
}
