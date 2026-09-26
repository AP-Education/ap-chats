import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { channelsRoutes } from '../pages/channels/route';
import { overviewRoute } from '../pages/overview/route';
import { placeholderRoutes } from '../pages/placeholder/route';
import { ProtectedLayout } from './ProtectedLayout';

const router = createBrowserRouter([
  { path: 'auth/callback', lazy: () => import('../pages/auth/CallbackPage') },
  {
    Component: ProtectedLayout,
    children: [overviewRoute, ...channelsRoutes, ...placeholderRoutes],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
