import { useCurrentUser } from '@ap/shell-sdk';
import { UserIcon } from '@phosphor-icons/react';
import { Button, Spin } from 'antd';

import { useSignOut } from '@/features/apps/hooks/useSignOut';
import { UserCard } from '@/features/layout/components/UserCard';

export function AuthStatus() {
  const user = useCurrentUser();
  const signOut = useSignOut();

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

  const { profile } = user;
  return (
    <UserCard
      name={profile?.name ?? 'Мій профіль'}
      caption={profile?.email ?? 'Обліковий запис'}
      picture={profile?.picture}
      onSignOut={signOut}
    />
  );
}
