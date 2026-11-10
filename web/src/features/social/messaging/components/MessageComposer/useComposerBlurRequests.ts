import { useEffect, useEffectEvent, useRef } from 'react';

import { useConversation } from '@/features/social/conversation-scope/store';

/**
 * Hears each request to step the composer aside, such as the history being dragged: a gesture of
 * the person's own, so the requests made before mounting are not heard.
 */
export function useComposerBlurRequests(onRequest: () => void): void {
  const token = useConversation((state) => state.blurComposerToken);
  const heardToken = useRef(token);
  const hear = useEffectEvent(onRequest);

  useEffect(() => {
    const isNew = heardToken.current !== token;
    heardToken.current = token;
    if (isNew) hear();
  }, [token]);
}
