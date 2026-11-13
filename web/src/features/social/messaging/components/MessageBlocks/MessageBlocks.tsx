import { Fragment, type ReactNode, type RefObject } from 'react';

import { StarMeMessageBlock } from '@/features/star-me/components/StarMeBlock/StarMeMessageBlock';

import type { Attachment, AttachmentDraft } from '../../attachments/types';
import type { MessageBlock } from '../../types';
import { PendingVoiceMessage } from '../../voice/PendingVoiceMessage';
import { VoiceMessage } from '../../voice/VoiceMessage';
import { GifView } from './GifView';

interface BlockPlace {
  messageId: string;
  /** The time, on the block that closes the bubble. */
  meta: ReactNode;
  attachments: Attachment[];
  drafts: AttachmentDraft[];
  available: boolean;
  contentRef?: RefObject<HTMLDivElement | null>;
}

type BlockViews = {
  [Type in MessageBlock['type']]: (
    block: Extract<MessageBlock, { type: Type }>,
    place: BlockPlace,
  ) => ReactNode;
};

// One view per kind of block: a new kind is a component here and a member of MessageBlock.
const blockViews: BlockViews = {
  'star-me': (block, { contentRef, meta }) => (
    <StarMeMessageBlock block={block} contentRef={contentRef} meta={meta} />
  ),
  gif: (block, { messageId, meta }) => (
    <GifView block={block} messageId={messageId} overlay={meta} />
  ),
  voice: (block, { messageId, meta, attachments, drafts, available }) => {
    const draft = drafts.find((file) => file.key === block.attachmentId);
    if (draft) {
      return (
        <PendingVoiceMessage
          draft={draft}
          durationMs={block.durationMs}
          rowId={messageId}
          meta={meta}
        />
      );
    }

    const attachment = attachments.find((file) => file.id === block.attachmentId);
    if (!attachment?.voice || attachment.preview !== 'audio') return null;

    return (
      <VoiceMessage
        attachment={attachment}
        messageId={messageId}
        available={available}
        footer={meta}
      />
    );
  },
};

/** What a message shows under its text, in the order the API lists it; the last one carries the time. */
export function MessageBlocks({
  blocks,
  messageId,
  meta,
  attachments = [],
  drafts = [],
  available = true,
  contentRef,
}: {
  blocks: MessageBlock[];
  messageId: string;
  meta?: ReactNode;
  attachments?: Attachment[];
  drafts?: AttachmentDraft[];
  available?: boolean;
  contentRef?: RefObject<HTMLDivElement | null>;
}) {
  return blocks.map((block, index) => (
    <Fragment key={`${block.type}:${index}`}>
      {renderBlock(block, {
        messageId,
        meta: index === blocks.length - 1 ? meta : null,
        attachments,
        drafts,
        available,
        contentRef,
      })}
    </Fragment>
  ));
}

function renderBlock<Type extends MessageBlock['type']>(
  block: Extract<MessageBlock, { type: Type }>,
  place: BlockPlace,
) {
  const view = blockViews[block.type] as BlockViews[Type];
  return view(block, place);
}
