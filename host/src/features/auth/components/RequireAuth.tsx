import { useCurrentUser } from '@ap/shell-sdk';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { ShellSkeleton } from '@/shared/ui/ShellSkeleton';

import { AuthFailureScreen } from './AuthFailureScreen';

// The gate for everything except /auth/callback (see app/router.tsx) — no route past
// this point renders anything until there's a signed-in user.
export function RequireAuth({ children }: PropsWithChildren) {
  const user = useCurrentUser();
  const signInStarted = useRef(false);

  // Everything past this gate requires a session anyway, so skip the extra click and
  // go straight to SSO — except after a failed attempt, where auto-retrying would just
  // bounce the browser in a loop instead of showing what went wrong.
  useEffect(() => {
    if (user.status === 'signed-out' && !user.retry && !signInStarted.current) {
      signInStarted.current = true;
      user.signIn();
    }
  }, [user]);

  if (user.status === 'loading') {
    return <ShellSkeleton />;
  }

  if (user.status === 'unavailable') {
    return (
      <AuthFailureScreen
        title="Вхід не налаштований"
        description="Зверніться до адміністратора, щоб отримати доступ."
      />
    );
  }

  if (user.status === 'signed-out') {
    if (user.retry) {
      return <AuthFailureScreen onRetry={user.signIn} />;
    }
    return <ShellSkeleton />;
  }

  return <>{children}</>;
}
