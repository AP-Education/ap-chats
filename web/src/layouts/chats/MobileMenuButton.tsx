import { useMobileMenu } from '@ap/shell-sdk';
import { useIsMobile } from '@ap/shell-ui';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { IconButton } from '@/shared/ui/IconButton';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    position: relative;
    color: ${token.colorText};
  `,
  badge: css`
    position: absolute;
    right: 0;
    bottom: 0;
    display: grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding-inline: 4px;
    border-radius: 9px;
    background: ${token.colorError};
    color: ${token.colorWhite};
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  `,
}));

export function MobileMenuButton() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const menu = useMobileMenu();

  if (!isMobile) return null;

  return (
    <IconButton
      size={44}
      className={styles.button}
      data-mobile-menu-trigger
      aria-controls="mobile-navigation"
      aria-expanded={menu.isOpen}
      aria-label={`Відкрити список розмов${menu.unreadCount > 0 ? `, ${menu.unreadCount} непрочитаних` : ''}`}
      onClick={menu.open}
    >
      <ArrowLeftIcon size={22} />
      {menu.unreadCount > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {menu.unreadCount > 99 ? '99+' : menu.unreadCount}
        </span>
      )}
    </IconButton>
  );
}
