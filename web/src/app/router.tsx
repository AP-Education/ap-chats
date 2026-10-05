import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { callsRoutes } from '../pages/calls/route';
import { channelsRoutes } from '../pages/channels/route';
import { directRoutes } from '../pages/direct/route';
import { overviewRoute } from '../pages/overview/route';
import { placeholderRoutes } from '../pages/placeholder/route';
import { AppLoading } from '../shared/ui/AppLoading/AppLoading';
import { ProtectedLayout } from './ProtectedLayout';

const router = createBrowserRouter([
  { path: 'auth/callback', lazy: () => import('../pages/auth/CallbackPage') },
  {
    Component: ProtectedLayout,
    children: [
      overviewRoute,
      ...channelsRoutes,
      ...directRoutes,
      ...callsRoutes,
      ...placeholderRoutes,
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} fallbackElement={<AppLoading />} />;
}
