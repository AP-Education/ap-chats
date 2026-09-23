import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { overviewRoute } from '../pages/overview/route';
import { placeholderRoutes } from '../pages/placeholder/route';

const router = createBrowserRouter([
  {
    Component: MainLayout,
    children: [overviewRoute, ...placeholderRoutes],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
