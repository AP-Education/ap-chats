import type { AttachmentRef } from '../attachments/types';
import type { MessageGif } from '../content/message-gif';
import type { NormalizedMessageContent } from '../content/message-markdown';

/** A send request as written, normalized before any lock is taken. */
export interface MessageDraft {
  content: NormalizedMessageContent;
  attachmentRefs: AttachmentRef[];
  gif: MessageGif | null;
  replyToMessageId: string | null;
  quoteText: string | null;
  clientNonce: string;
  /** Recognizes a retry of this exact request under the same nonce. */
  requestDigest: string;
}
