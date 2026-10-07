import { useEffect } from 'react';
import { hasAuthParams, useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

import { safeReturnTo } from '@/features/auth/api/return-to';
import { ShellSkeleton } from '@/shared/ui/ShellSkeleton';

import { AuthFailureScreen } from './AuthFailureScreen';

export function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();
  const processing = auth.isLoading || hasAuthParams();
  const ready = Boolean(
    !auth.error && !processing && auth.isAuthenticated && auth.user && !auth.user.expired,
  );
  const returnTo = safeReturnTo(auth.user?.state);

  useEffect(() => {
    if (ready) void navigate(returnTo, { replace: true });
  }, [ready, returnTo, navigate]);

  if (!ready && (auth.error || !processing)) {
    return <AuthFailureScreen onRetry={() => void auth.signinRedirect({ state: { returnTo } })} />;
  }

  return <ShellSkeleton />;
}
