import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { RequiredWorkspaceContext } from '../stores/required-workspace-context';

const useStyles = createStyles(({ token, css }) => ({
  centered: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: ${token.paddingLG}px;
  `,
}));

interface RequiredWorkspaceLayoutProps {
  loadingFallback: ReactNode;
}

export function RequiredWorkspaceLayout({ loadingFallback }: RequiredWorkspaceLayoutProps) {
  const { styles } = useStyles();
  const { workspace, isLoading, isError, retry } = useActiveWorkspace();

  if (isLoading) return loadingFallback;

  if (isError && !workspace) {
    return (
      <Result
        status="error"
        title="Не вдалося завантажити робочі простори"
        extra={<Button onClick={retry}>Спробувати ще раз</Button>}
      />
    );
  }

  if (!workspace) {
    return (
      <div className={styles.centered}>
        <Empty description="Спершу створіть робочий простір угорі." />
      </div>
    );
  }

  return (
    <RequiredWorkspaceContext.Provider value={workspace}>
      <Outlet />
    </RequiredWorkspaceContext.Provider>
  );
}
