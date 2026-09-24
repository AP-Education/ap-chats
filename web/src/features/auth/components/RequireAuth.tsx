import { Button, Result, Spin } from 'antd';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { useCurrentUser } from '../stores/current-user-context';

// The gate for everything except /auth/callback (see app/router.tsx) — no route past
// this point renders anything until there's a signed-in user.
export function RequireAuth({ children }: PropsWithChildren) {
  const user = useCurrentUser();

  // Everything past this gate requires a session anyway, so skip the extra click and
  // go straight to SSO — except after a failed attempt, where auto-retrying would just
  // bounce the browser in a loop instead of showing what went wrong.
  useEffect(() => {
    if (user.status === 'signed-out' && !user.retry) {
      user.signIn();
    }
  }, [user]);

  if (user.status === 'loading') {
    return <Result icon={<Spin size="large" />} title="Завантаження" />;
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
    if (user.retry) {
      return (
        <Result
          status="error"
          title="Не вдалося увійти"
          extra={
            <Button type="primary" onClick={user.signIn}>
              Спробувати ще раз
            </Button>
          }
        />
      );
    }
    return <Result icon={<Spin size="large" />} title="Перенаправляємо на вхід" />;
  }

  return <>{children}</>;
}
