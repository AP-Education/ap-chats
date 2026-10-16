import { Fragment, type ReactNode } from 'react';

import type { MessageBlock } from '../../types';
import { GifView } from './GifView';

interface BlockPlace {
  messageId: string;
  /** The time, on the block that closes the bubble. */
  overlay: ReactNode;
}

type BlockViews = {
  [Type in MessageBlock['type']]: (
    block: Extract<MessageBlock, { type: Type }>,
    place: BlockPlace,
  ) => ReactNode;
};

// One view per kind of block: a new kind is a component here and a member of MessageBlock.
const blockViews: BlockViews = {
  gif: (block, { messageId, overlay }) => (
    <GifView block={block} messageId={messageId} overlay={overlay} />
  ),
};

/** What a message shows under its text, in the order the API lists it; the last one carries the time. */
export function MessageBlocks({
  blocks,
  messageId,
  overlay,
}: {
  blocks: MessageBlock[];
  messageId: string;
  overlay?: ReactNode;
}) {
  return blocks.map((block, index) => (
    <Fragment key={`${block.type}:${index}`}>
      {blockViews[block.type](block, {
        messageId,
        overlay: index === blocks.length - 1 ? overlay : null,
      })}
    </Fragment>
  ));
}
