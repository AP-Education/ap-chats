import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('reactions');

  return (
    <BottomSheet open onClose={onClose} aria-label={t(($) => $.picker)}>
      <div className={styles.panel}>{children}</div>
    </BottomSheet>
  );
}
