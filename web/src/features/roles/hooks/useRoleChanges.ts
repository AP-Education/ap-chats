import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';

import { onRoleChanges, type RoleChange } from '../role-changes';

/** Runs `listener` after every successful role change in any workspace. */
export function useRoleChanges(listener: (change: RoleChange) => void): void {
  const queryClient = useQueryClient();
  const handle = useEffectEvent(listener);

  useEffect(() => onRoleChanges(queryClient, handle), [queryClient]);
}
