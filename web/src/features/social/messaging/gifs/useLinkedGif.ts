import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { messagingQueryKeys } from '../queryKeys';
import type { MessageBlock } from '../types';
import { firstGifLink } from './gif-links';
import { linkedGifBlock } from './linked-gif';

// Long enough for a GIF to answer, short enough that a message never waits on it for long.
const FIND_TIMEOUT_MS = 1_500;

/** The GIF for the first GIF link in a text; the text goes without one if it is slow or gone. */
export function useLinkedGif() {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const lookup = (link: string) => ({
      queryKey: messagingQueryKeys.gif(link),
      queryFn: ({ signal }: { signal: AbortSignal }) => linkedGifBlock(link, signal),
      staleTime: Infinity,
    });

    return {
      /** Starts finding the GIF while the text is still being written. */
      prefetch(markdown: string) {
        const link = firstGifLink(markdown);
        if (link) void queryClient.prefetchQuery(lookup(link));
      },

      /** The blocks to send with a text, or none when there is no new GIF to bring. */
      async blocksFor(markdown: string, current: MessageBlock[] = []) {
        const link = firstGifLink(markdown);
        const isNew = link !== null && !current.some((block) => block.link === link);
        if (!isNew) return undefined;

        const timeout = new Promise<null>((resolve) => setTimeout(resolve, FIND_TIMEOUT_MS, null));
        const block = await Promise.race([queryClient.fetchQuery(lookup(link)), timeout]).catch(
          () => null,
        );
        return block ? [block] : undefined;
      },
    };
  }, [queryClient]);
}
