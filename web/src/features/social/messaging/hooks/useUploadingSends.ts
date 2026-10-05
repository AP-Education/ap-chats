import { useState } from 'react';

import type { AttachmentDraft } from '../attachments/types';
import type { PendingAttachmentCommit, SendMessageCommand } from '../types';

interface UploadingSend {
  markdown: string;
  replyToMessageId?: string;
  quoteText?: string;
  createdAt: string;
  drafts: AttachmentDraft[];
}

/**
 * Tracks sends that are showing in the timeline already but still waiting on
 * their attachments to finish uploading (sending never waits on upload
 * completion — matches Discord/Telegram/Slack/WhatsApp). Once every
 * attachment reaches 'ready', hands the real send off to `onReady`; a failed
 * upload hands the drafts back to the composer (`uncommit`) instead, since
 * nothing was ever dispatched to retry.
 */
export function useUploadingSends(onReady: (input: SendMessageCommand, createdAt: string) => void) {
  const [uploadingSends, setUploadingSends] = useState<ReadonlyMap<string, UploadingSend>>(
    () => new Map(),
  );

  function start(
    input: { markdown: string; replyToMessageId?: string; quoteText?: string },
    pending: PendingAttachmentCommit,
  ) {
    const { nonce, drafts, watchCommitted, uncommit, releaseCommitted } = pending;
    const createdAt = new Date().toISOString();
    const drop = () =>
      setUploadingSends((current) => {
        if (!current.has(nonce)) return current;
        const next = new Map(current);
        next.delete(nonce);
        return next;
      });
    setUploadingSends((current) => {
      const next = new Map(current);
      next.set(nonce, {
        markdown: input.markdown,
        replyToMessageId: input.replyToMessageId,
        quoteText: input.quoteText,
        createdAt,
        drafts,
      });
      return next;
    });
    const unsubscribe = watchCommitted(nonce, (nextDrafts) => {
      if (nextDrafts.some((draft) => draft.status === 'error')) {
        unsubscribe();
        uncommit(nonce);
        drop();
        return;
      }
      setUploadingSends((current) => {
        if (!current.has(nonce)) return current;
        const next = new Map(current);
        next.set(nonce, { ...next.get(nonce)!, drafts: nextDrafts });
        return next;
      });
      if (nextDrafts.every((draft) => draft.status === 'ready')) {
        unsubscribe();
        releaseCommitted(nonce);
        drop();
        onReady(
          {
            markdown: input.markdown,
            clientNonce: nonce,
            replyToMessageId: input.replyToMessageId,
            quoteText: input.quoteText,
            attachments: nextDrafts.map((draft) => ({
              ...draft.attachment!,
              description: draft.description || null,
            })),
          },
          createdAt,
        );
      }
    });
  }

  return { uploadingSends, start };
}
