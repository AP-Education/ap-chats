import { Button, Result, Spin } from 'antd';
import { useAuth } from 'react-oidc-context';

export function ConnectedCallbackPage() {
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

  return <Result icon={<Spin size="large" />} title="Зачекайте" />;
}
