import type { ReactNode } from 'react';

import type { MemberSummary } from '@/features/workspaces/types';

import type { MessageReaction } from '../reactions/types';
import type { Attachment, AttachmentDraft } from './attachments/types';

export interface Message {
  id: string;
  seq: string;
  authorMemberId: string;
  clientNonce: string | null;
  markdown: string | null;
  attachments?: Attachment[];
  contentVersion: number;
  revision: number;
  replyToMessageId: string | null;
  quoteText: string | null;
  isForwarded: boolean;
  forwardedFromMemberId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface MessageHistoryItem {
  type: 'MESSAGE';
  id: string;
  seq: string;
  createdAt: string;
  message: Message;
  author: MessageAuthor;
  reply: {
    id: string;
    authorMemberId: string;
    author: MessageAuthor | null;
    markdown: string | null;
  } | null;
  forwardedFrom: MessageAuthor | null;
  pin: { pinnedAt: string; pinnedByMemberId: string } | null;
  mentions?: MemberSummary[];
  /** Whether the message reached the viewer, by name, through a role or through @everyone. */
  mentionsMe?: boolean;
  /** The roles through which it reached the viewer. */
  rolesMentioningMe?: string[];
  reactions?: MessageReaction[];
}

export type CallEntryStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

export interface CallHistoryItem {
  type: 'CALL';
  id: string;
  seq: string;
  createdAt: string;
  call: {
    id: string;
    status: CallEntryStatus;
    startedByMemberId: string;
    startedAt: string;
    answeredAt: string | null;
    endedAt: string | null;
  };
  startedBy: MessageAuthor;
}

// A row in the channel timeline: exactly one kind, never a grab-bag of
// optional message/call fields (mirrors the backend's HistoryRow union).
export type HistoryItem = MessageHistoryItem | CallHistoryItem;

// The one shared narrowing point: selection, editing, forwarding, pinning and
// read-receipts are message-only concepts, and all of them filter through this
// same predicate rather than re-deriving `item.type === 'MESSAGE'` locally.
export function isMessageItem(item: HistoryItem): item is MessageHistoryItem {
  return item.type === 'MESSAGE';
}

export interface MessageAuthor extends MemberSummary {
  /** Their top coloured role's colour, which their name takes, as on Discord. */
  roleColor: string | null;
}

export interface ReadState {
  lastReadEntrySeq: string;
  unreadCount: number;
}

export interface HistoryPage {
  items: HistoryItem[];
  snapshotSeq: string;
  firstUnreadSeq: string | null;
  unreadCount: number;
  hasOlder: boolean;
  olderCursor: string | null;
  hasNewer: boolean;
  newerCursor: string | null;
  readState: ReadState | null;
  /** How far the others have read; null where the conversation shares no read receipts. */
  peerReadSeq: string | null;
}

/** One end of the loaded history: whether more lies past it, and how to bring it in. */
export interface HistoryEdge {
  available: boolean;
  loading: boolean;
  load: () => Promise<unknown>;
}

/** The stretch of history a timeline shows, opened at a linked message or where reading stopped. */
export interface HistoryWindow {
  pages: HistoryPage[];
  targetMessageId?: string;
  older: HistoryEdge;
  newer: HistoryEdge;
}

// The command this feature works with: full attachment objects, since the
// composer already has them from the upload queue and the optimistic echo
// needs to render them immediately. messages-api.ts alone knows how the wire
// format differs (attachment refs, no clientNonce) and translates at the edge.
export interface SendMessageCommand {
  markdown: string;
  clientNonce: string;
  replyToMessageId?: string;
  quoteText?: string;
  attachments?: Attachment[];
  /** The composer's names for its inline references, so the echo shows them before history does. */
  labels?: Record<string, string>;
}

// 'uploading': attachments are still in flight — sending never waits on them
// (matches Discord/Telegram/Slack/WhatsApp), so a message can sit here before
// it's even been POSTed at all, not just awaiting server confirmation.
export type DeliveryStatus = 'uploading' | 'sending' | 'failed';

export interface DisplayItem {
  item: HistoryItem;
  delivery: DeliveryStatus | undefined;
  /** Only set while `delivery === 'uploading'`: live attachment progress to render instead of `item.message.attachments`. */
  pendingAttachments?: AttachmentDraft[];
}

// What a composer hands useMessageOperations' send() when it has attachments
// committed (from useAttachments' commit()) but not necessarily uploaded yet.
export interface PendingAttachmentCommit {
  nonce: string;
  drafts: AttachmentDraft[];
  watchCommitted: (nonce: string, onUpdate: (drafts: AttachmentDraft[]) => void) => () => void;
  uncommit: (nonce: string) => void;
  releaseCommitted: (nonce: string) => void;
}

// What any feature can offer on messages: the conversation gathers them, message rows show them.
export type ActionTarget =
  | { kind: 'message'; items: [MessageHistoryItem] }
  | { kind: 'text'; items: [MessageHistoryItem]; selectedText: string }
  | { kind: 'batch'; items: MessageHistoryItem[] };

export interface ActionContext {
  memberId: string | undefined;
  canManage: boolean;
  canPin: boolean;
  canPost: boolean;
  canReact: boolean;
}

export interface ActionCommands {
  reply: (item: MessageHistoryItem, quoteText?: string) => void;
  edit: (item: MessageHistoryItem) => void;
  remove: (items: MessageHistoryItem[]) => void;
  select: (item: MessageHistoryItem) => void;
  copy: (items: MessageHistoryItem[], selectedText?: string) => void;
  forward: (items: MessageHistoryItem[]) => void;
  pin: (item: MessageHistoryItem, active: boolean) => void;
  showReactions: (item: MessageHistoryItem) => void;
  /** Asks a member, such as an assistant, about the messages: the composer addresses them. */
  ask: (member: MemberSummary, items: MessageHistoryItem[]) => void;
}

/** How an action stands out: a destructive one warns, an assistant's leads on its own sky. */
export type ActionAccent = 'danger' | 'ai';

export interface ConversationAction {
  id: string;
  icon: ReactNode;
  accent?: ActionAccent;
  label: (target: ActionTarget) => string;
  available: (target: ActionTarget, context: ActionContext) => boolean;
  execute: (target: ActionTarget, commands: ActionCommands) => void;
}
