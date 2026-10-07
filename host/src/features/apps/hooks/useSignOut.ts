import { useCurrentUser } from '@ap/shell-sdk';
import { useContext } from 'react';

import { SignOutHooksContext } from '@/features/apps/stores/sign-out-hooks';

/** Signs out after every application's `useBeforeSignOut` hook has settled. */
export function useSignOut(): () => void {
  const hooks = useContext(SignOutHooksContext);
  const user = useCurrentUser();

  return () => {
    if (user.status !== 'signed-in') return;
    void Promise.allSettled([...hooks].map((hook) => hook())).finally(user.signOut);
  };
}
