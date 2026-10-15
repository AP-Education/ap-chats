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
  /** Reaction chips close the bubble. */
  reactions: boolean;
}

interface BubbleContent {
  hasText: boolean;
  hasImages: boolean;
  hasFiles: boolean;
  jumboEmoji: number;
  reactions: boolean;
}

export function bubbleLayout(
  item: MessageHistoryItem,
  pendingAttachments: AttachmentDraft[] | undefined,
  editing: boolean,
): BubbleLayout {
  const content = bubbleContent(item, pendingAttachments);
  const { hasText, jumboEmoji } = content;

  if (editing) return { variant: 'text', hasText, jumboEmoji: 0, meta: null, reactions: false };

  return {
    variant: bubbleVariant(content),
    hasText,
    jumboEmoji,
    meta: metaPlacement(content),
    reactions: content.reactions,
  };
}

function bubbleContent(
  item: MessageHistoryItem,
  pendingAttachments: AttachmentDraft[] | undefined,
): BubbleContent {
  const markdown = item.message.markdown;
  const attachments = item.message.attachments ?? [];
  const images = pendingAttachments ? [] : attachments.filter((file) => file.preview === 'image');
  const hasAttachments = attachments.length > 0 || Boolean(pendingAttachments);

  return {
    hasText: Boolean(markdown?.trim()),
    hasImages: images.length > 0,
    hasFiles: pendingAttachments
      ? pendingAttachments.length > 0
      : images.length < attachments.length,
    jumboEmoji: hasAttachments ? 0 : jumboEmojiCount(markdown),
    reactions: Boolean(item.reactions?.length),
  };
}

function bubbleVariant({ jumboEmoji, hasImages }: BubbleContent): BubbleVariant {
  if (jumboEmoji) return 'emoji';
  return hasImages ? 'media' : 'text';
}

// The time closes whatever ends the bubble: the last line of text, the files, the reaction row,
// or the photo and large emoji it sits on.
function metaPlacement({
  jumboEmoji,
  hasText,
  hasFiles,
  reactions,
}: BubbleContent): MessageMetaPlacement {
  if (jumboEmoji) return 'emoji';
  if (!hasText && !hasFiles) return 'overlay';
  if (reactions) return 'reactions';
  return hasText ? 'inline' : 'block';
}
