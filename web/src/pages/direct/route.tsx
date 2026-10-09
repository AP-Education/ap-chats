import { Page } from '@ap-education/ui';
import type { RouteObject } from 'react-router-dom';

import { LastConversationRoute } from '@/features/social/conversation/LastConversationRoute';
import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';

import DirectMessagePage from './DirectMessagePage';

export const directRoutes = [
  {
    path: 'direct',
    element: <RequiredWorkspaceLayout loadingFallback={<Page />} />,
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
