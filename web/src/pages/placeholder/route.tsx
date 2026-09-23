import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const PlaceholderPage = lazy(() => import('./PlaceholderPage'));

const placeholders = [
  ['channels', 'Канали'],
  ['messages', 'Особисті повідомлення'],
  ['calls', 'Дзвінки'],
  ['*', 'Сторінку не знайдено'],
] as const;

export const placeholderRoutes = placeholders.map(([path, title]) => ({
  path,
  element: <PlaceholderPage title={title} />,
})) satisfies RouteObject[];
