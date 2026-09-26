import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';
import { ChatLoading } from '@/shared/ui/ChatLayout/ChatLoading';

const ChannelContent = lazy(() => import('./ChannelContent'));

export const channelsRoutes = [
  {
    path: 'channels',
    element: <RequiredWorkspaceLayout loadingFallback={<ChatLoading />} />,
    children: [
      { index: true, element: <ChannelContent /> },
      { path: ':channelId', element: <ChannelContent /> },
    ],
  },
] satisfies RouteObject[];
