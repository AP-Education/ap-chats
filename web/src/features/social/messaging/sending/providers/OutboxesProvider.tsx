import { useQueryClient } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

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

  return <OutboxesContext.Provider value={outboxes}>{children}</OutboxesContext.Provider>;
}
