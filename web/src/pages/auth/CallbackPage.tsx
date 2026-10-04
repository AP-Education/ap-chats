import { Navigate } from 'react-router-dom';

import { AuthFailureScreen } from '@/features/auth/components/AuthFailureScreen';
import { getAppShell } from '@/lib/app-shell';

import { oidcConfigured } from '../../features/auth/api/oidc-config';
import { ConnectedCallbackPage } from './ConnectedCallbackPage';

export function Component() {
  if (getAppShell().kind !== 'browser') return <Navigate to="/" replace />;

  if (!oidcConfigured) {
    return (
      <AuthFailureScreen
        title="Вхід зараз недоступний"
        description="Зверніться до адміністратора, щоб отримати доступ."
      />
    );
  }
  return <ConnectedCallbackPage />;
}
