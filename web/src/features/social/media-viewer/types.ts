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

/** What the viewer holds at one place: a media, or the wait for more history at either end. */
export type GallerySlide =
  { kind: 'media'; media: ViewerMedia } | { kind: 'loading'; edge: HistoryEdge };

export type HistoryEdge = 'older' | 'newer';

export type HistoryEdges = Record<HistoryEdge, boolean>;

/** The conversation's paged history, as its infinite query has it. */
export interface PagedHistory {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isFetchingPreviousPage: boolean;
  isFetchingNextPage: boolean;
  fetchPreviousPage: () => Promise<unknown>;
  fetchNextPage: () => Promise<unknown>;
}

/** What the viewer can do to the message a media came in, as its row in the chat can. */
export interface ViewerActions {
  actions: ConversationAction[];
  context: ActionContext;
  run: (action: ConversationAction, target: ActionTarget) => void;
  showInChat: (messageId: string) => void;
}
