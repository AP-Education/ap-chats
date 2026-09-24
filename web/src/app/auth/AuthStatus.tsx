import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Spin } from 'antd';
import { useAuth } from 'react-oidc-context';
import { useLocation } from 'react-router-dom';

import { oidcConfigured } from '../providers/OidcProvider';
import styles from './AuthStatus.module.css';

interface CurrentUser {
  sub: string;
  appId: string;
}

async function fetchCurrentUser(token: string, signal: AbortSignal): Promise<CurrentUser> {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Identity check failed: ${response.status}`);
  return (await response.json()) as CurrentUser;
}

export function AuthStatus() {
  if (!oidcConfigured) {
    return (
      <Button type="text" icon={<UserOutlined />} disabled>
        Увійти
      </Button>
    );
  }
  return <ConnectedAuthStatus />;
}

function ConnectedAuthStatus() {
  const auth = useAuth();
  const location = useLocation();
  const token = auth.user?.access_token;
  const identity = useQuery({
    queryKey: ['auth', 'me', auth.user?.profile.sub, auth.user?.expires_at],
    queryFn: ({ signal }) => fetchCurrentUser(token!, signal),
    enabled: auth.isAuthenticated && Boolean(token) && !auth.user?.expired,
    retry: false,
  });

  if (auth.isLoading) return <Spin size="small" />;
  if (auth.isAuthenticated && auth.user && !auth.user.expired) {
    const { profile } = auth.user;
    const name = typeof profile.name === 'string' ? profile.name : undefined;
    const picture =
      typeof profile.picture === 'string' && profile.picture ? profile.picture : undefined;

    return (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'name', label: name ?? 'Мій профіль', disabled: true },
            {
              key: 'status',
              label: identity.isSuccess
                ? 'Вхід підтверджено'
                : identity.isError
                  ? 'Не вдалося перевірити вхід'
                  : 'Перевіряємо вхід',
              disabled: true,
            },
            { type: 'divider' },
            { key: 'logout', label: 'Вийти', onClick: () => void auth.removeUser() },
          ],
        }}
      >
        <button className={styles.trigger} type="button" aria-label="Профіль">
          <Avatar size={48} src={picture} icon={!picture && !name ? <UserOutlined /> : undefined}>
            {!picture && name ? name[0] : undefined}
          </Avatar>
          <DownOutlined />
        </button>
      </Dropdown>
    );
  }
  return (
    <Button
      type="text"
      onClick={() =>
        void auth.signinRedirect({ state: { returnTo: location.pathname + location.search } })
      }
    >
      {auth.error ? 'Спробувати увійти' : 'Увійти'}
    </Button>
  );
}
