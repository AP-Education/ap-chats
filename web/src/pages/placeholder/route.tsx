import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const PlaceholderPage = lazy(() => import('./PlaceholderPage'));

const placeholders = [['*', 'notFound']] as const;

export const placeholderRoutes = placeholders.map(([path, placeholder]) => ({
  path,
  element: <PlaceholderPage placeholder={placeholder} />,
})) satisfies RouteObject[];
