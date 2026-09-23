import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { OverviewPage } from '../../pages/OverviewPage';
import { PlaceholderPage } from '../../pages/PlaceholderPage';
import { MainLayout } from '../layouts/MainLayout';

const router = createBrowserRouter([
  {
    Component: MainLayout,
    children: [
      { index: true, Component: OverviewPage },
      { path: 'channels', element: <PlaceholderPage title="Канали" /> },
      { path: 'messages', element: <PlaceholderPage title="Особисті повідомлення" /> },
      { path: 'calls', element: <PlaceholderPage title="Дзвінки" /> },
      { path: '*', element: <PlaceholderPage title="Сторінку не знайдено" /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
