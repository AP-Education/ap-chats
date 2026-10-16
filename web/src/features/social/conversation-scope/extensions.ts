import { type ComponentType, createContext, type ReactNode, useContext } from 'react';

import type {
  ConversationAction,
  Message,
  MessageHistoryItem,
  SendMessageCommand,
} from '../messaging/types';

/** A message the person sent from the composer, and what they composed it as. */
export interface SentMessage {
  channelId: string;
  input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>;
  /** The messages an `ask` intent picked. */
  picked?: string[];
  /** Who wrote the message it replies to. */
  replyToAuthorId?: string;
  /** Resolves once the server holds the message. */
  landed: Promise<Message>;
}

/** The composer's own commands, for a send option to take the draft over. */
export interface ComposerCommands {
  /** The message as it would go now: the person's words under the current intent. */
  read: () => Omit<SendMessageCommand, 'clientNonce' | 'attachments'>;
  /** Empties the composer the way sending does. */
  clear: () => void;
}

/** What a send option is told of the draft to decide whether it can take it. */
export interface ComposerDraftState {
  hasAttachments: boolean;
  /** Its intent still means the same if the message goes out later. */
  canWait: boolean;
}

export interface SendOptionDialogProps {
  composer: ComposerCommands;
  onClose: () => void;
}

/** Another way to send what the composer holds, offered beside its send button. */
export interface SendOption {
  id: string;
  label: string;
  icon: ReactNode;
  /** Why it cannot take this draft; nothing when it can. */
  unavailable?: (draft: ComposerDraftState) => string | undefined;
  /** Takes the draft over and decides what becomes of it. */
  Dialog: ComponentType<SendOptionDialogProps>;
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
  /** Other ways to send, offered on the send button's long press and right click. */
  sendOptions?: SendOption[];
  /** Beside the composer's own buttons, e.g. a way into what waits to go out. */
  ComposerAccessory?: ComponentType;
}

export const ConversationExtensionsContext = createContext<readonly ConversationExtension[]>([]);

export function useConversationExtensions(): readonly ConversationExtension[] {
  return useContext(ConversationExtensionsContext);
}
