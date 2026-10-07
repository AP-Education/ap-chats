import type { AttachmentDraft } from '../../attachments/types';
import type { MessageHistoryItem } from '../../types';
import type { BubbleVariant } from '../Bubble/Bubble';
import type { MessageMetaPlacement } from './MessageMeta';

// One grapheme only — a pictographic run joined by ZWJ (so a family/profession
// emoji still counts as one) or a flag's pair of regional indicators. Two
// separate emoji side by side, or any other text, fails this.
const SINGLE_EMOJI_PATTERN = new RegExp(
  '^(?:\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?' +
    '(?:\\u200D\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?)*' +
    '|\\p{Regional_Indicator}\\p{Regional_Indicator})$',
  'u',
);

export function isSingleEmoji(markdown: string | null) {
  return markdown !== null && SINGLE_EMOJI_PATTERN.test(markdown.trim());
}

export interface BubbleLayout {
  variant: BubbleVariant;
  hasText: boolean;
  /** Where the time goes; null while the message is being edited. */
  meta: MessageMetaPlacement | null;
}

export function bubbleLayout(
  item: MessageHistoryItem,
  pendingAttachments: AttachmentDraft[] | undefined,
  editing: boolean,
): BubbleLayout {
  const markdown = item.message.markdown;
  const hasText = Boolean(markdown?.trim());
  const attachments = item.message.attachments ?? [];
  const images = pendingAttachments ? [] : attachments.filter((file) => file.preview === 'image');
  const hasFiles = pendingAttachments
    ? pendingAttachments.length > 0
    : images.length < attachments.length;

  if (editing) return { variant: 'text', hasText, meta: null };
  if (hasText && isSingleEmoji(markdown) && !attachments.length && !pendingAttachments)
    return { variant: 'emoji', hasText, meta: 'standalone' };

  const variant = images.length ? 'media' : 'text';
  if (hasText) return { variant, hasText, meta: 'inline' };
  if (hasFiles) return { variant, hasText, meta: 'block' };
  return { variant, hasText, meta: 'overlay' };
}
