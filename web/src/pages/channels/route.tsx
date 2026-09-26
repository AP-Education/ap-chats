import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const ChannelsPage = lazy(() => import('./ChannelsPage'));

// Both paths render the same page — it reads :channelId (or its absence)
// itself via useParams, rather than nesting an Outlet just to share one param.
export const channelsRoutes = [
  { path: 'channels', element: <ChannelsPage /> },
  { path: 'channels/:channelId', element: <ChannelsPage /> },
] satisfies RouteObject[];
