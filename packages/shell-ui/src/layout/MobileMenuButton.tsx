import { useMobileMenu } from '@ap/shell-sdk';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { useIsMobile } from '../hooks/useIsMobile';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    cursor: pointer;

    &:active {
      background: ${token.colorFillTertiary};
    }
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

/** Opens the shell's navigation sheet on mobile; renders nothing on wider screens. */
export function MobileMenuButton() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const menu = useMobileMenu();

  if (!isMobile) return null;

  return (
    <button
      type="button"
      className={styles.button}
      data-mobile-menu-trigger
      aria-controls="mobile-navigation"
      aria-expanded={menu.isOpen}
      aria-label={`Відкрити меню${menu.unreadCount > 0 ? `, ${menu.unreadCount} непрочитаних` : ''}`}
      onClick={menu.open}
    >
      <ArrowLeftIcon size={22} />
      {menu.unreadCount > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {menu.unreadCount > 99 ? '99+' : menu.unreadCount}
        </span>
      )}
    </button>
  );
}
