import type { Attachment } from '../messaging/attachments/types';
import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
  GifBlock,
  MessageHistoryItem,
} from '../messaging/types';

export type MediaSource =
  { kind: 'image' | 'video'; attachment: Attachment } | { kind: 'gif'; block: GifBlock };

/** A photo, video or GIF the viewer pages through, with the message it came in. */
export interface ViewerMedia {
  /** `${messageId}:${attachmentId}`, or `${messageId}:gif`; its bubble carries the same key. */
  key: string;
  item: MessageHistoryItem;
  source: MediaSource;
  /** The message's text, shown under the media; null when there is nothing to show. */
  caption: string | null;
  /** Where it sits among its own message's media, for "2 з 4". */
  position: { index: number; total: number };
}

/** What the viewer can do to the message a media came in, as its row in the chat can. */
export interface ViewerActions {
  actions: ConversationAction[];
  context: ActionContext;
  run: (action: ConversationAction, target: ActionTarget) => void;
  showInChat: (messageId: string) => void;
}
