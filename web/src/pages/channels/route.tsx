import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';
import { LastConversationRoute } from '@/features/social/conversation/LastConversationRoute';
import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';

const ChannelContent = lazy(() => import('./ChannelContent'));

export const channelsRoutes = [
  {
    path: 'channels',
    element: <RequiredWorkspaceLayout loadingFallback={<ChatLoading />} />,
    children: [
      {
        index: true,
        element: (
          <LastConversationRoute section="channels">
            <ChannelContent />
          </LastConversationRoute>
        ),
      },
      { path: ':channelId', element: <ChannelContent /> },
    ],
  },
] satisfies RouteObject[];
