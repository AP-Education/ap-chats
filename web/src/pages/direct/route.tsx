import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';
import { LastConversationRoute } from '@/features/social/conversation/LastConversationRoute';
import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';
import { conversationRoute } from '@/shared/router/conversationRoute';

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
      { path: ':channelId', handle: conversationRoute, element: <DirectMessagePage /> },
    ],
  },
] satisfies RouteObject[];
