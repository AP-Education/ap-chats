import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  stacked: css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: ${token.marginSM}px;
  `,
  back: css`
    align-self: flex-start;
  `,
}));

interface MobileRolesLayoutProps {
  list: ReactNode;
  /** The chosen role; the list shows while nothing is chosen. */
  details: ReactNode;
  onBack: () => void;
}

export function MobileRolesLayout({ list, details, onBack }: MobileRolesLayoutProps) {
  const { styles } = useStyles();
  if (!details) return list;

  return (
    <div className={styles.stacked}>
      <Button
        type="text"
        className={styles.back}
        icon={<ArrowLeftIcon size={18} />}
        onClick={onBack}
      >
        Усі ролі
      </Button>
      {details}
    </div>
  );
}
