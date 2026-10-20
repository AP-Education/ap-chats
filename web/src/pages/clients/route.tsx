import type { RouteObject } from 'react-router-dom';

import ClientConversationPage from './ClientConversationPage';

export const clientsRoutes = [
  {
    path: 'clients',
    children: [
      { index: true, element: <ClientConversationPage /> },
      { path: ':conversationId', element: <ClientConversationPage /> },
    ],
  },
] satisfies RouteObject[];
