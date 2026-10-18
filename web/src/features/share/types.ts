// Bridge protocol for sharing into the app from others: mirrors mobile/src/features/share/types.

/** A file another app shared, which the native shell holds; the page never reads it itself. */
export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

/** What another app shared through the system share sheet. */
export interface SharedContent {
  id: string;
  text: string | null;
  files: SharedFile[];
}

export type ShareFromNativeMessage =
  | { type: 'share/received'; payload: SharedContent }
  | { type: 'share/part-progress'; requestId: number; bytes: number }
  /** `status` is the storage's HTTP answer, or 0 when no answer came. */
  | { type: 'share/part-sent'; requestId: number; status: number };

export type ShareToNativeMessage =
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
