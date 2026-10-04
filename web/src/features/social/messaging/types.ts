import type { CSSProperties, Ref } from 'react';

import type { Attachment } from './attachments/types';

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
  mentions?: { memberId: string; displayName: string | null; avatarPath: string | null }[];
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

export interface MessageAuthor {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
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
}

// Messaging's extension point for its text input: markdown plus a label
// dictionary for whatever inline reference tokens (today, @-mentions) the
// plugged-in editor renders as chips. Messaging owns this contract; mentions
// is one implementation of it, not the other way around.
export interface ComposerDraft {
  markdown: string;
  labels: Record<string, string>;
}

export interface ComposerEditorApi {
  markdown: () => string;
  clear: () => void;
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
  /** Captures the current caret so a later resumeInput/insertText can restore it even after focus has moved elsewhere. */
  saveSelection: () => void;
  /** Disables real DOM input (e.g. while a native keyboard-replacement panel is shown) without moving focus. */
  suspendInput: () => void;
  /** Re-enables real input without moving focus — used when a panel closes but the real keyboard will reclaim focus on its own. */
  releaseInput: () => void;
  /** Re-enables real input and restores focus, optionally placing the caret at a viewport point. */
  resumeInput: (point?: { x: number; y: number }) => void;
  /** Resumes input while placing the caret at the given viewport point. */
  focusAtPoint: (clientX: number, clientY: number) => void;
}

export interface ComposerEditorSlotProps {
  editorRef?: Ref<ComposerEditorApi>;
  initialDraft?: ComposerDraft;
  /** Identifies the draft being edited, for an implementation that needs to remount when it changes (e.g. to re-run a mount-time restore). */
  draftKey?: string;
  className?: string;
  editorStyle?: CSSProperties;
  ariaLabel: string;
  placeholder?: string;
  autoFocus?: boolean;
  onChange?: (draft: ComposerDraft) => void;
  onSubmit?: () => void;
  onEscape?: () => void;
  onPasteFiles?: (files: File[]) => void;
}
