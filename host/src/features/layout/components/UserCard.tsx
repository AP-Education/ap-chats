import { Avatar, useIsMobile } from '@ap/ui';
import { SignOutIcon } from '@phosphor-icons/react';

import styles from './UserCard.module.css';

interface UserCardProps {
  name: string;
  caption: string;
  /** URL of the profile picture. */
  picture?: string;
  onSignOut: () => void;
}

/** The signed-in user at the bottom of the sider, with a sign-out button. */
export function UserCard({ name, caption, picture, onSignOut }: UserCardProps) {
  const isMobile = useIsMobile();

  return (
    <div className={styles.profile}>
      <Avatar src={picture} alt={name} size={isMobile ? 48 : 40} shape="circle" />
      <div className={styles.identity}>
        <span className={styles.name}>{name}</span>
        <span className={styles.caption}>{caption}</span>
      </div>
      <button
        className={styles.signOut}
        type="button"
        aria-label="Вийти"
        title="Вийти"
        onClick={onSignOut}
      >
        <SignOutIcon size={isMobile ? 24 : 20} weight="regular" />
      </button>
    </div>
  );
}
