import { useMobileMenu, useMobileMenuTrigger } from '@ap-education/shell-sdk';
import { CountBadge, IconButton, useIsMobile } from '@ap-education/ui';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    position: relative;
    color: ${token.colorText};
  `,
  badge: css`
    position: absolute;
    right: 0;
    bottom: 0;
  `,
}));

export function MobileMenuButton() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const { badgeCount: unreadCount } = useMobileMenu();
  const trigger = useMobileMenuTrigger();

  if (!isMobile) return null;

  const label =
    unreadCount > 0
      ? `Відкрити список розмов, непрочитаних: ${unreadCount}`
      : 'Відкрити список розмов';

  return (
    <IconButton size={44} className={styles.button} aria-label={label} {...trigger}>
      <ArrowLeftIcon size={22} />
      <CountBadge count={unreadCount} className={styles.badge} />
    </IconButton>
  );
}
