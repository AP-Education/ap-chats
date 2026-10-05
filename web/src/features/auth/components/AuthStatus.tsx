import { SignOutIcon, UserIcon } from '@phosphor-icons/react';
import { Button, Spin } from 'antd';

import { useIsMobile } from '@/shared/hooks/useIsMobile';

import { Avatar } from '../../../shared/ui/Avatar/Avatar';
import { useCurrentUser } from '../stores/current-user-context';
import styles from './AuthStatus.module.css';

export function AuthStatus({ beforeSignOut }: { beforeSignOut?: () => Promise<void> }) {
  const user = useCurrentUser();
  const isMobile = useIsMobile();

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
    <div className={styles.profile}>
      <Avatar
        path={profile?.picture ?? null}
        alt={profile?.name ?? 'Профіль'}
        size={isMobile ? 48 : 36}
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
        onClick={() =>
          void (async () => {
            try {
              await beforeSignOut?.();
            } finally {
              signOut();
            }
          })()
        }
      >
        <SignOutIcon size={isMobile ? 24 : 20} weight="regular" />
      </button>
    </div>
  );
}
