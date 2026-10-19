import { useEffect, useMemo, useSyncExternalStore } from 'react';

import type { UnsentMessages } from '../types';
import { useConversationSending } from './useConversationSending';

/** The conversation's unsent messages, let go once history holds them. */
export function useConversationOutbox(
  workspaceId: string,
  channelId: string,
  delivered: ReadonlySet<string>,
) {
  const { outbox } = useConversationSending(workspaceId, channelId);
  const snapshot = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot);

  useEffect(() => outbox.forget(delivered), [outbox, delivered]);

  // Stable, so rows reading them from context skip renders their own message didn't cause.
  const actions = useMemo<UnsentMessages>(
    () => ({
      retry: (nonce) => outbox.retry(nonce),
      discard: (nonce) => outbox.cancel(nonce),
      discardFile: (nonce, key) => outbox.cancelFile(nonce, key),
    }),
    [outbox],
  );

  return { outbox, snapshot, actions };
}
