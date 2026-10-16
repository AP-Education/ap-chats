import { Button } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  load: css`
    align-self: center;
    margin: ${token.marginXXS}px 0 ${token.marginSM}px;
  `,
}));

interface LoadMoreButtonProps {
  icon: ReactNode;
  loading: boolean;
  onLoad: () => Promise<unknown>;
  children: ReactNode;
}

export function LoadMoreButton({ icon, loading, onLoad, children }: LoadMoreButtonProps) {
  const { styles } = useStyles();

  return (
    <Button
      className={styles.load}
      shape="round"
      icon={icon}
      loading={loading}
      onClick={() => void onLoad()}
    >
      {children}
    </Button>
  );
}
