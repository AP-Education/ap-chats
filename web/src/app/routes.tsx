import type { RouteObject } from 'react-router-dom';

import { callsRoutes } from '../pages/calls/route';
import { channelsRoutes } from '../pages/channels/route';
import { directRoutes } from '../pages/direct/route';
import { overviewRoute } from '../pages/overview/route';
import { placeholderRoutes } from '../pages/placeholder/route';

export const chatsRoutes: RouteObject[] = [
  overviewRoute,
  ...channelsRoutes,
  ...directRoutes,
  ...callsRoutes,
  ...placeholderRoutes,
];
