import { useMobileMenu } from '@ap-education/shell-sdk';
import { createStyles } from 'antd-style';
import { type PropsWithChildren, useEffect, useEffectEvent } from 'react';
import { Drawer } from 'vaul';

const insetTop = 'var(--app-inset-top, env(safe-area-inset-top, 0px))';
const insetBottom = 'var(--app-inset-bottom, env(safe-area-inset-bottom, 0px))';
const keyboardInset = 'var(--app-keyboard-inset, 0px)';
// The shell drawer's pace (@ap-education/ui DRAWER_DURATION); vaul already moves on its curve.
const MOVE_DURATION = '320ms';

const useStyles = createStyles(({ token, css }) => ({
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: ${token.zIndexPopupBase};
    background: ${token.colorBgMask};

    &[data-vaul-overlay] {
      animation-duration: ${MOVE_DURATION};
    }
  `,
  // The sheet rises from the bottom edge, so its last action stays above the home indicator,
  // and above the native keyboard, which covers the page instead of resizing it.
  sheet: css`
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: ${token.zIndexPopupBase};
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - ${insetTop} - 24px);
    padding: 8px 12px calc(16px + max(${keyboardInset}, ${insetBottom}));
    border-radius: 20px 20px 0 0;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
    outline: none;

    &[data-vaul-drawer] {
      animation-duration: ${MOVE_DURATION};
    }
  `,
  title: css`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  `,
  handle: css`
    flex: none;
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
  /** Keeps one height while the content changes; the content then fills it. */
  height?: string;
}

/** A sheet of actions rising from the bottom of a phone screen; a finger pulls it down to close. */
export function BottomSheet({
  open,
  onClose,
  height,
  children,
  'aria-label': label,
}: BottomSheetProps) {
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
    : undefined;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      // The native keyboard covers the page and sends its inset; the sheet pads for it itself.
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className={styles.overlay} />
        <Drawer.Content
          className={styles.sheet}
          style={size ? { height: size } : undefined}
          aria-modal
          aria-describedby={undefined}
        >
          <Drawer.Title className={styles.title}>{label}</Drawer.Title>
          <div className={styles.handle} aria-hidden="true" />
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
