import { Button, Result } from 'antd';

import { oidcConfigured } from '../../features/auth/api/oidc-config';
import { ConnectedCallbackPage } from './ConnectedCallbackPage';

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
