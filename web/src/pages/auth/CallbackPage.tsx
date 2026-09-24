import { Button, Result, Spin } from 'antd';
import { useAuth } from 'react-oidc-context';

import { oidcConfigured } from '../../features/auth/api/oidc-config';

export function Component() {
  if (!oidcConfigured) {
    return (
      <Result
        status="warning"
        title="Вхід зараз недоступний"
        extra={<Button href="/">На головну</Button>}
      />
    );
  }
  return <ConnectedCallbackPage />;
}

function ConnectedCallbackPage() {
  const auth = useAuth();
  if (auth.error) {
    return (
      <Result
        status="error"
        title="Не вдалося увійти"
        subTitle="Спробуйте ще раз"
        extra={<Button href="/">На головну</Button>}
      />
    );
  }
  return <Result icon={<Spin size="large" />} title="Зачекайте…" />;
}
