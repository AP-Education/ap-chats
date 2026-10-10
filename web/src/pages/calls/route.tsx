import { Page } from '@ap-education/ui';
import type { RouteObject } from 'react-router-dom';

import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';

import DirectMessagePage from '../direct/DirectMessagePage';
import NoCallSelected from './NoCallSelected';

// A conversation opened from a call stays under the calls tab, so going back lands on the calls.
export const callsRoutes = [
  {
    path: 'calls',
    element: <RequiredWorkspaceLayout loadingFallback={<Page />} />,
    children: [
      { index: true, element: <NoCallSelected /> },
      { path: ':channelId', element: <DirectMessagePage /> },
    ],
  },
] satisfies RouteObject[];
