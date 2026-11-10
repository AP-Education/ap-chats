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
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { RequiredWorkspaceContext } from '../stores/required-workspace-context';

interface RequiredWorkspaceLayoutProps {
  loadingFallback: ReactNode;
}

export function RequiredWorkspaceLayout({ loadingFallback }: RequiredWorkspaceLayoutProps) {
  const { t } = useTranslation(['workspaces', 'common']);
  const { workspace, isLoading, isError, retry } = useActiveWorkspace();

  if (isLoading) return loadingFallback;

  if (isError && !workspace) {
    return (
      <StatePage role="alert">
        <ContentStateIcon tone="danger">
          <WarningCircleIcon />
        </ContentStateIcon>
        <ContentStateTitle>{t(($) => $.loadFailed)}</ContentStateTitle>
        <ContentStateActions>
          <Button onClick={retry}>{t(($) => $.common.actions.tryAgain)}</Button>
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
        <ContentStateTitle>{t(($) => $.noWorkspace.title)}</ContentStateTitle>
        <ContentStateDescription>{t(($) => $.noWorkspace.description)}</ContentStateDescription>
      </StatePage>
    );
  }

  return (
    <RequiredWorkspaceContext.Provider value={workspace}>
      <Outlet />
    </RequiredWorkspaceContext.Provider>
  );
}
