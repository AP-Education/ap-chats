import { Page } from '@ap-education/ui';
import type { RouteObject } from 'react-router-dom';

import { LastConversationRoute } from '@/features/social/conversation/LastConversationRoute';
import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';

import ChannelContent from './ChannelContent';

export const channelsRoutes = [
  {
    path: 'channels',
    element: <RequiredWorkspaceLayout loadingFallback={<Page />} />,
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
