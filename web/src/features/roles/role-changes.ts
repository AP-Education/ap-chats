import type { MutationKey, QueryClient } from '@tanstack/react-query';

const ROLE_CHANGE = 'role-change';

/** A workspace whose roles, or the people in them, just changed. */
export interface RoleChange {
  identity: string | undefined;
  workspaceId: string;
}

/** Marks a mutation as a role change, so features built on roles hear of it. */
export function roleChangeKey(identity: string | undefined, workspaceId: string): MutationKey {
  return [ROLE_CHANGE, identity, workspaceId];
}

/**
 * Calls `listener` after each role change succeeds, wherever it was made. Roles stay unaware of
 * who depends on them: member lists, channel lists and profiles refresh themselves.
 */
export function onRoleChanges(
  queryClient: QueryClient,
  listener: (change: RoleChange) => void,
): () => void {
  return queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;

    const [kind, identity, workspaceId] = event.mutation.options.mutationKey ?? [];
    if (kind !== ROLE_CHANGE || typeof workspaceId !== 'string') return;

    listener({ identity: identity as string | undefined, workspaceId });
  });
}
