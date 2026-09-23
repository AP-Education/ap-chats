import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const OverviewPage = lazy(() => import('./OverviewPage'));

export const overviewRoute = {
  index: true,
  element: <OverviewPage />,
} satisfies RouteObject;
