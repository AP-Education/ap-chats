import { UserOutlined } from '@ant-design/icons';
import { SignOutIcon } from '@phosphor-icons/react';
import { Button, Spin } from 'antd';

import { Avatar } from '../../../shared/ui/Avatar/Avatar';
import { useCurrentUser } from '../stores/current-user-context';
import styles from './AuthStatus.module.css';

export function AuthStatus() {
  const user = useCurrentUser();

  if (user.status === 'loading') return <Spin size="small" />;

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
    <div className={styles.profile}>
      <Avatar
        path={profile?.picture ?? null}
        alt={profile?.name ?? 'Профіль'}
        size={36}
        shape="circle"
      />
      <div className={styles.identity}>
        <span className={styles.name}>{profile?.name ?? 'Мій профіль'}</span>
        <span className={styles.caption}>{profile?.email ?? 'Обліковий запис'}</span>
      </div>
      <button
        className={styles.signOut}
        type="button"
        aria-label="Вийти"
        title="Вийти"
        onClick={signOut}
      >
        <SignOutIcon size={20} weight="regular" />
      </button>
    </div>
  );
}
