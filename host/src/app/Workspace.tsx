import { ShellHost } from '@/features/apps/components/ShellHost';
import { AuthFailureScreen } from '@/features/auth/components/AuthFailureScreen';
import { AuthStatus } from '@/features/auth/components/AuthStatus';

import { apps } from './apps';

export function Workspace() {
  if (apps.length === 0) {
    return (
      <AuthFailureScreen
        title="Застосунки не налаштовані"
        description="Зверніться до адміністратора, щоб отримати доступ."
      />
    );
  }

  return <ShellHost apps={apps} footer={<AuthStatus />} />;
}
