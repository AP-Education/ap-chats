import { Fragment, type ReactNode } from 'react';

import type { MessageBlock } from '../../types';
import { GifView } from './GifView';

type BlockViews = {
  [Type in MessageBlock['type']]: (
    block: Extract<MessageBlock, { type: Type }>,
    overlay: ReactNode,
  ) => ReactNode;
};

// One view per kind of block: a new kind is a component here and a member of MessageBlock.
const blockViews: BlockViews = {
  gif: (block, overlay) => <GifView block={block} overlay={overlay} />,
};

/** What a message shows under its text, in the order the API lists it; the last one carries the time. */
export function MessageBlocks({
  blocks,
  overlay,
}: {
  blocks: MessageBlock[];
  overlay?: ReactNode;
}) {
  return blocks.map((block, index) => (
    <Fragment key={`${block.type}:${index}`}>
      {blockViews[block.type](block, index === blocks.length - 1 ? overlay : null)}
    </Fragment>
  ));
}
