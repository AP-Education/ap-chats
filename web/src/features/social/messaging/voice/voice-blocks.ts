import type { Attachment } from '../attachments/types';
import type { VoiceBlock } from '../types';

/** Older history carries the same verified voice metadata only on its attachments. */
export function voiceBlocks(attachments: readonly Attachment[]): VoiceBlock[] {
  return attachments.flatMap((attachment) =>
    attachment.voice && attachment.preview === 'audio'
      ? [{ type: 'voice', attachmentId: attachment.id, durationMs: attachment.voice.durationMs }]
      : [],
  );
}
