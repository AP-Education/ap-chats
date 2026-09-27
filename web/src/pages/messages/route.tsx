import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';
import { ChatLoading } from '@/shared/ui/ChatLayout/ChatLoading';

const DirectMessagePage = lazy(() => import('./DirectMessagePage'));

export const messageRoutes = [
  {
    path: 'messages',
    element: <RequiredWorkspaceLayout loadingFallback={<ChatLoading />} />,
    children: [
      { index: true, element: <DirectMessagePage /> },
      { path: ':channelId', element: <DirectMessagePage /> },
    ],
  },
] satisfies RouteObject[];
