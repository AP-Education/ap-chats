import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { LastConversationRoute } from '@/features/social/conversation/LastConversationRoute';
import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';
import { ChatLoading } from '@/shared/ui/ChatLayout/ChatLoading';

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
