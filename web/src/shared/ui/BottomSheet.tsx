import { Drawer } from 'antd';
import { createStyles } from 'antd-style';
import type { PropsWithChildren } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    overflow: hidden;
    border-radius: 20px 20px 0 0;
  `,
  // The sheet rises from the bottom edge, so its last action stays above the home indicator.
  body: css`
    && {
      padding: 8px 12px calc(16px + env(safe-area-inset-bottom, 0px));
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
}

/** A sheet of actions rising from the bottom of a phone screen. */
export function BottomSheet({ open, onClose, children, ...rest }: BottomSheetProps) {
  const { styles } = useStyles();

  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      closable={false}
      size="auto"
      classNames={{ section: styles.section, body: styles.body }}
      {...rest}
    >
      <div className={styles.handle} aria-hidden="true" />
      {children}
    </Drawer>
  );
}
