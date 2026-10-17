import { useQueryClient } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { Outboxes } from './outboxes';
import { OutboxesContext } from './outboxes-context';

/** Keeps every conversation's sends and files going while Chats runs, whichever chat is open.
 * Signing out stops them; closing Chats lets messages already on their way finish. */
export function OutboxesProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { identity, token } = useQueryAuth();
  const [outboxes] = useState(() => new Outboxes(queryClient));

  useEffect(() => {
    outboxes.setSession(identity, token);
  }, [outboxes, identity, token]);

  return <OutboxesContext.Provider value={outboxes}>{children}</OutboxesContext.Provider>;
}
