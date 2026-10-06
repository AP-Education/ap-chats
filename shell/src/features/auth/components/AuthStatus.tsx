import { useCurrentUser } from '@ap/shell-sdk';
import { UserCard } from '@ap/shell-ui';
import { UserIcon } from '@phosphor-icons/react';
import { Button, Spin } from 'antd';

interface AuthStatusProps {
  /** Runs before the shell signs out, so applications can clean up (e.g. push subscriptions). */
  beforeSignOut?: () => Promise<void>;
}

export function AuthStatus({ beforeSignOut }: AuthStatusProps) {
  const user = useCurrentUser();

  if (user.status === 'loading') return <Spin size="small" />;

  if (user.status === 'unavailable') {
    return (
      <Button type="text" icon={<UserIcon size={18} />} disabled>
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
    <UserCard
      name={profile?.name ?? 'Мій профіль'}
      caption={profile?.email ?? 'Обліковий запис'}
      picture={profile?.picture}
      onSignOut={() => void Promise.resolve(beforeSignOut?.()).finally(signOut)}
    />
  );
}
