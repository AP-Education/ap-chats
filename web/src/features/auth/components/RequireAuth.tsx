import { Button, Result, Spin } from 'antd';
import type { PropsWithChildren } from 'react';

import { useCurrentUser } from '../stores/current-user-context';

// The gate for everything except /auth/callback (see app/router.tsx) — no route past
// this point renders anything until there's a signed-in user.
export function RequireAuth({ children }: PropsWithChildren) {
  const user = useCurrentUser();

  if (user.status === 'loading') {
    return <Result icon={<Spin size="large" />} title="Завантаження…" />;
  }

  if (user.status === 'unavailable') {
    return (
      <Result
        status="warning"
        title="Вхід не налаштований"
        subTitle="Зверніться до адміністратора, щоб отримати доступ."
      />
    );
  }

  if (user.status === 'signed-out') {
    return (
      <Result
        status="info"
        title="Увійдіть, щоб продовжити"
        extra={
          <Button type="primary" onClick={user.signIn}>
            {user.retry ? 'Спробувати увійти' : 'Увійти'}
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
