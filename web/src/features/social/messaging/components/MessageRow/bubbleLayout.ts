import type { AttachmentDraft } from '../../attachments/types';
import type { MessageHistoryItem } from '../../types';
import type { BubbleVariant } from '../Bubble/Bubble';
import type { MessageMetaPlacement } from './MessageMeta';

const MAX_JUMBO_EMOJI = 3;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
// A grapheme cluster keeps ZWJ families, skin tones and flags together as one emoji.
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]️?⃣)/u;
const LETTER = /\p{L}/u;

/** How many emoji a message is made of, when it is only one to three of them; otherwise 0. */
export function jumboEmojiCount(markdown: string | null): number {
  const text = markdown?.replace(/\s+/g, '') ?? '';
  if (!text) return 0;

  const clusters = [...graphemes.segment(text)].map(({ segment }) => segment);
  if (clusters.length > MAX_JUMBO_EMOJI) return 0;

  const onlyEmoji = clusters.every((cluster) => EMOJI.test(cluster) && !LETTER.test(cluster));
  return onlyEmoji ? clusters.length : 0;
}

export interface BubbleLayout {
  variant: BubbleVariant;
  hasText: boolean;
  /** One to three when the text is shown as large emoji without a bubble. */
  jumboEmoji: number;
  /** Where the time goes; null while the message is being edited. */
  meta: MessageMetaPlacement | null;
  /** Reaction chips close the bubble; the time moves onto their row when it would close text. */
  reactions: boolean;
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
  const jumboEmoji = attachments.length || pendingAttachments ? 0 : jumboEmojiCount(markdown);
  const reactions = !editing && Boolean(item.reactions?.length);

  if (editing) return { variant: 'text', hasText, jumboEmoji: 0, meta: null, reactions };
  if (jumboEmoji) return { variant: 'emoji', hasText, jumboEmoji, meta: 'emoji', reactions };

  const variant = images.length ? 'media' : 'text';
  if (hasText)
    return { variant, hasText, jumboEmoji, meta: reactions ? 'reactions' : 'inline', reactions };
  if (hasFiles)
    return { variant, hasText, jumboEmoji, meta: reactions ? 'reactions' : 'block', reactions };
  return { variant, hasText, jumboEmoji, meta: 'overlay', reactions };
}
