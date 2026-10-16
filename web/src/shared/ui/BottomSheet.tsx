import { useMobileMenu } from '@ap-education/shell-sdk';
import { Drawer } from 'antd';
import { createStyles, cx } from 'antd-style';
import { type PropsWithChildren, useEffect, useEffectEvent } from 'react';

const insetTop = 'var(--app-inset-top, env(safe-area-inset-top, 0px))';
const insetBottom = 'var(--app-inset-bottom, env(safe-area-inset-bottom, 0px))';
const keyboardInset = 'var(--app-keyboard-inset, 0px)';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    overflow: hidden;
    border-radius: 20px 20px 0 0;
  `,
  // The sheet rises from the bottom edge, so its last action stays above the home indicator,
  // and above the native keyboard, which covers the page instead of resizing it.
  body: css`
    && {
      padding: 8px 12px calc(16px + max(${keyboardInset}, ${insetBottom}));
    }
  `,
  filled: css`
    && {
      display: flex;
      flex-direction: column;
    }
  `,
  handle: css`
    width: 36px;
    height: 4px;
    margin: 2px auto 16px;
    border-radius: 2px;
    background: ${token.colorBorder};
  `,
}));

interface BottomSheetProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  destroyOnHidden?: boolean;
  /** Keeps one height while the content changes; the content then fills it. */
  height?: string;
}

/** A sheet of actions rising from the bottom of a phone screen. */
export function BottomSheet({ open, onClose, height, children, ...rest }: BottomSheetProps) {
  const { styles } = useStyles();
  const { isOpen: menuOpen } = useMobileMenu();
  const closeForMenu = useEffectEvent(() => {
    if (open) onClose();
  });

  // The app's menu slides in over the page, so a sheet left open would float above it.
  useEffect(() => {
    if (menuOpen) closeForMenu();
  }, [menuOpen]);

  // Grows by the keyboard so as much stays in view above it, short of the top of the screen.
  const size = height
    ? `min(calc(${height} + ${keyboardInset}), calc(100dvh - ${insetTop} - 24px))`
    : 'auto';

  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      closable={false}
      size={size}
      classNames={{ section: styles.section, body: cx(styles.body, height && styles.filled) }}
      {...rest}
    >
      <div className={styles.handle} aria-hidden="true" />
      {children}
    </Drawer>
  );
}
