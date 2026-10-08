import {
  ContentStateActions,
  ContentStateDescription,
  ContentStateIcon,
  ContentStateTitle,
  StatePage,
} from '@ap-education/ui';
import { SquaresFourIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { RequiredWorkspaceContext } from '../stores/required-workspace-context';

interface RequiredWorkspaceLayoutProps {
  loadingFallback: ReactNode;
}

export function RequiredWorkspaceLayout({ loadingFallback }: RequiredWorkspaceLayoutProps) {
  const { workspace, isLoading, isError, retry } = useActiveWorkspace();

  if (isLoading) return loadingFallback;

  if (isError && !workspace) {
    return (
      <StatePage role="alert">
        <ContentStateIcon tone="danger">
          <WarningCircleIcon />
        </ContentStateIcon>
        <ContentStateTitle>Не вдалося завантажити робочі простори</ContentStateTitle>
        <ContentStateActions>
          <Button onClick={retry}>Спробувати ще раз</Button>
        </ContentStateActions>
      </StatePage>
    );
  }

  if (!workspace) {
    return (
      <StatePage>
        <ContentStateIcon>
          <SquaresFourIcon />
        </ContentStateIcon>
        <ContentStateTitle>Робочого простору ще немає</ContentStateTitle>
        <ContentStateDescription>
          Створіть його кнопкою «+» серед робочих просторів.
        </ContentStateDescription>
      </StatePage>
    );
  }

  return (
    <RequiredWorkspaceContext.Provider value={workspace}>
      <Outlet />
    </RequiredWorkspaceContext.Provider>
  );
}
