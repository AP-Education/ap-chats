import { getAppShell } from '@ap/shell-sdk';
import { Navigate } from 'react-router-dom';

import { oidcConfigured } from '../features/auth/api/oidc-config';
import { AuthCallback } from '../features/auth/components/AuthCallback';
import { AuthFailureScreen } from '../features/auth/components/AuthFailureScreen';

export function CallbackPage() {
  if (getAppShell().kind !== 'browser') return <Navigate to="/" replace />;

  if (!oidcConfigured) {
    return (
      <AuthFailureScreen
        title="Вхід зараз недоступний"
        description="Зверніться до адміністратора, щоб отримати доступ."
      />
    );
  }
  return <AuthCallback />;
}
