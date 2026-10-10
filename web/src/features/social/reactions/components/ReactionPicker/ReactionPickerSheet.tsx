import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

const useStyles = createStyles(({ css }) => ({
  panel: css`
    display: flex;
    flex-direction: column;
    height: min(60dvh, 480px);
  `,
}));

export function ReactionPickerSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const { styles } = useStyles();

  return (
    <BottomSheet open onClose={onClose} aria-label="Вибір реакції">
      <div className={styles.panel}>{children}</div>
    </BottomSheet>
  );
}
