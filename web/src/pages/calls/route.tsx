import { Skeleton } from 'antd';
import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RequiredWorkspaceLayout } from '@/features/workspaces/layouts/RequiredWorkspaceLayout';

const CallsPage = lazy(() => import('./CallsPage'));

export const callsRoutes = [
  {
    path: 'calls',
    element: (
      <RequiredWorkspaceLayout
        loadingFallback={
          <div role="status" aria-label="Завантажуємо дзвінки" style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        }
      />
    ),
    children: [{ index: true, element: <CallsPage /> }],
  },
] satisfies RouteObject[];
