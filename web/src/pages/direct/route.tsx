import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { LastConversationRoute } from '@/features/social/conversation/LastConversationRoute';
import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';
import { ChatLoading } from '@/shared/ui/ChatLayout/ChatLoading';

const DirectMessagePage = lazy(() => import('./DirectMessagePage'));

export const directRoutes = [
  {
    path: 'direct',
    element: <RequiredWorkspaceLayout loadingFallback={<ChatLoading />} />,
    children: [
      {
        index: true,
        element: (
          <LastConversationRoute section="direct">
            <DirectMessagePage />
          </LastConversationRoute>
        ),
      },
      { path: ':channelId', element: <DirectMessagePage /> },
    ],
  },
] satisfies RouteObject[];
