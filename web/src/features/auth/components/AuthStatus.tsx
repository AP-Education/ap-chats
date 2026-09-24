import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Spin } from 'antd';

import { useCurrentUser } from '../stores/current-user-context';
import styles from './AuthStatus.module.css';

interface Identity {
  sub: string;
  appId: string;
}

async function fetchIdentity(token: string, signal: AbortSignal): Promise<Identity> {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Identity check failed: ${response.status}`);
  return (await response.json()) as Identity;
}

export function AuthStatus() {
  const user = useCurrentUser();
  const accessToken = user.status === 'signed-in' ? user.accessToken : undefined;

  const identity = useQuery({
    queryKey: ['auth', 'me', accessToken],
    queryFn: ({ signal }) => fetchIdentity(accessToken!, signal),
    enabled: Boolean(accessToken),
    retry: false,
  });

  if (user.status === 'loading') {
    return <Spin size="small" />;
  }

  if (user.status === 'unavailable') {
    return (
      <Button type="text" icon={<UserOutlined />} disabled>
        Увійти
      </Button>
    );
  }

  if (user.status === 'signed-out') {
    return (
      <Button type="text" onClick={user.signIn}>
        {user.retry ? 'Спробувати увійти' : 'Увійти'}
      </Button>
    );
  }

  const { profile, signOut } = user;
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'name', label: profile?.name ?? 'Мій профіль', disabled: true },
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
          { key: 'logout', label: 'Вийти', onClick: signOut },
        ],
      }}
    >
      <button className={styles.trigger} type="button" aria-label="Профіль">
        <Avatar
          size={48}
          src={profile?.picture}
          icon={!profile?.picture && !profile?.name ? <UserOutlined /> : undefined}
        >
          {!profile?.picture && profile?.name ? profile.name[0] : undefined}
        </Avatar>
        <DownOutlined />
      </button>
    </Dropdown>
  );
}
