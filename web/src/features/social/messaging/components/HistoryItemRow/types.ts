import type { ReactNode } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';

import type { AttachmentDraft } from '../../attachments/types';
import type { DeliveryStatus, HistoryItem, MessageHistoryItem } from '../../types';

// Everything a strategy might need, regardless of which fields its own kind
// actually uses (a call entry ignores onEdit/actions/delivery, for instance).
export interface HistoryItemRenderContext {
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  delivery: DeliveryStatus | undefined;
  pendingAttachments: AttachmentDraft[] | undefined;
  /** Sends an unsent row again, by the id it carries until the server confirms it. */
  onRetry: (rowId: string) => void;
}

// One strategy per HistoryItem kind. `item` stays the full union here — the
// strategy itself narrows internally, since TypeScript can't correlate a
// registry lookup by discriminant with the caller's own type at compile time.
export interface HistoryItemStrategy {
  render(item: HistoryItem, context: HistoryItemRenderContext): ReactNode;
}
