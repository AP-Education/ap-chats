import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { RequireAuth } from '../features/auth/components/RequireAuth';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { overviewRoute } from '../pages/overview/route';
import { placeholderRoutes } from '../pages/placeholder/route';

function ProtectedLayout() {
  return (
    <RequireAuth>
      <MainLayout />
    </RequireAuth>
  );
}

const router = createBrowserRouter([
  { path: 'auth/callback', lazy: () => import('../pages/auth/CallbackPage') },
  {
    Component: ProtectedLayout,
    children: [overviewRoute, ...placeholderRoutes],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
