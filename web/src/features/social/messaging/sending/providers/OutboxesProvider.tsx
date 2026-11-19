import { useQueryClient } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useStoreReloadGuard } from '@/shared/hooks/useReloadGuard';

import { createOutboxes } from '../stores/outboxes';
import { OutboxesContext } from '../stores/outboxes-context';

/** Signing out stops every conversation's sends; closing Chats lets those on their way finish. */
export function OutboxesProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { identity, token } = useQueryAuth();
  const [outboxes] = useState(() => createOutboxes(queryClient));

  useEffect(() => {
    outboxes.setSession(identity, token);
  }, [outboxes, identity, token]);

  // Reloading the page would drop the files going up and the requests carrying messages. The
  // outbox marks a message as sending before its request starts, so the shell hears of it first.
  useStoreReloadGuard('chats-sending', outboxes.subscribe, outboxes.isSending);

  return <OutboxesContext.Provider value={outboxes}>{children}</OutboxesContext.Provider>;
}
