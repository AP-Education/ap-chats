import type { MediaUrls, MediaVariant } from '@ap-education/ui/media';
import type { FetchQueryOptions, QueryClient, QueryKey } from '@tanstack/react-query';

import type { AttachmentMedia, ChatMedia } from '../../message-media';

/** The query through which the API signs one variant of a message's file. */
export type AttachmentUrlQueryOf<Key extends QueryKey = QueryKey> = (
  item: AttachmentMedia,
  variant: MediaVariant,
) => FetchQueryOptions<{ url: string }, Error, { url: string }, Key>;

// A signed address lives 15 minutes at least; one is reused well before it runs out. A download
// asks each time, so it never outlives the person's access to the message.
export function freshFor(variant: MediaVariant): number {
  return variant === 'download' ? 0 : 10 * 60_000;
}

// A download is always asked for, so it is never among the links a message brings.
function broughtLink({ links }: AttachmentMedia, variant: MediaVariant): string | undefined {
  return variant === 'download' ? undefined : links[variant];
}

/**
 * A conversation's media addresses as the bubbles and the viewer ask for them: a GIF's own, a
 * photo's from the links its message brought, anything else signed by the API when asked.
 */
export function attachmentUrls<Key extends QueryKey>(
  queryClient: QueryClient,
  queryOf: AttachmentUrlQueryOf<Key>,
): MediaUrls<ChatMedia> {
  return {
    cached: (item, variant) => {
      if (item.kind === 'gif') return item.src;

      const brought = broughtLink(item, variant);
      if (brought) return brought;

      const state = queryClient.getQueryState<{ url: string }>(queryOf(item, variant).queryKey);
      const isFresh = state !== undefined && Date.now() - state.dataUpdatedAt < freshFor(variant);
      return isFresh ? state.data?.url : undefined;
    },
    // Asked only when nothing at hand serves or what served broke, so it is signed afresh.
    fetch: async (item, variant) => {
      if (item.kind === 'gif') return item.src;

      const { url } = await queryClient.fetchQuery({ ...queryOf(item, variant), staleTime: 0 });
      return url;
    },
  };
}
