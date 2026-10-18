// Bridge protocol for sharing into the app from others: mirrors web/src/features/share/types.ts.
// Keep additive.

/** A file another app shared, which only this shell can read. */
export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

/** What another app shared through the system share sheet, as the page sees it. */
export interface SharedContent {
  id: string;
  text: string | null;
  files: SharedFile[];
}

export type ShareEvent =
  | { type: 'share/received'; payload: SharedContent }
  | { type: 'share/part-progress'; requestId: number; bytes: number }
  /** `status` is the storage's HTTP answer, or 0 when no answer came. */
  | { type: 'share/part-sent'; requestId: number; status: number };

export type ShareRequest =
  /** The page can take a share now; sent on every mount of its handler. */
  | { type: 'share/ready' }
  | { type: 'share/taken'; shareId: string }
  | {
      type: 'share/send-part';
      requestId: number;
      fileId: string;
      url: string;
      start: number;
      end: number;
    }
  | { type: 'share/cancel-part'; requestId: number };
