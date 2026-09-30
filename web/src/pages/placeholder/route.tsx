import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const PlaceholderPage = lazy(() => import('./PlaceholderPage'));

const placeholders = [['*', 'Сторінку не знайдено', 'Перевірте адресу сторінки']] as const;

export const placeholderRoutes = placeholders.map(([path, title, description]) => ({
  path,
  element: <PlaceholderPage title={title} description={description} />,
})) satisfies RouteObject[];
