import { hasVisualPreview } from '../../attachments/file-presentation';
import type { AttachmentDraft } from '../../attachments/types';
import { isLoneGif } from '../../gifs/gif-links';
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
  /** A GIF under the text closes the bubble, as on Discord. */
  hasGif: boolean;
  /** Nothing but a GIF, which then shows without a bubble. */
  isLoneGif: boolean;
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
  const media = pendingAttachments ? [] : attachments.filter(hasVisualPreview);
  const hasAttachments = attachments.length > 0 || Boolean(pendingAttachments);
  const gif = item.message.blocks?.find((block) => block.type === 'gif');
  const hasGif = Boolean(gif);
  // A lone GIF link says nothing the GIF itself does not, so only the GIF shows, as on Discord.
  const isOnlyGifLink = isLoneGif(item.message);

  return {
    hasText: Boolean(markdown?.trim()) && !isOnlyGifLink,
    hasImages: media.length > 0 || hasGif,
    hasGif,
    isLoneGif: hasGif && !hasAttachments && (!markdown?.trim() || isOnlyGifLink),
    hasFiles: pendingAttachments
      ? pendingAttachments.length > 0
      : media.length < attachments.length,
    jumboEmoji: hasAttachments ? 0 : jumboEmojiCount(markdown),
    reactions: Boolean(item.reactions?.length),
  };
}

function bubbleVariant({ jumboEmoji, isLoneGif, hasImages }: BubbleContent): BubbleVariant {
  if (jumboEmoji || isLoneGif) return 'bare';
  return hasImages ? 'media' : 'text';
}

// The time closes whatever ends the bubble: the last line of text, the files, the reaction row,
// or the photo, GIF and large emoji it sits on.
function metaPlacement({
  jumboEmoji,
  hasText,
  hasFiles,
  hasGif,
  reactions,
}: BubbleContent): MessageMetaPlacement {
  if (jumboEmoji) return 'emoji';
  if (!hasText && !hasFiles) return 'overlay';
  if (reactions) return 'reactions';
  if (hasGif) return 'overlay';
  return hasText ? 'inline' : 'block';
}
