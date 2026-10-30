import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const directory = {
  channels: [
    { id: 'design', name: 'Design room' },
    { id: 'general', name: 'Команда' },
  ],
  conversations: [
    {
      id: 'dm-existing',
      participant: {
        memberId: 'existing',
        displayName: 'Design colleague',
        avatarPath: null,
        isBot: false,
        active: true,
      },
    },
  ],
  people: [
    { memberId: 'new-person', displayName: 'Design new person', avatarPath: null, isBot: false },
  ],
};

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  plugins: [
    react(),
    {
      name: 'search-fixture-api',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const url = new URL(request.url ?? '/', 'http://fixture');
          if (!url.pathname.startsWith('/api/')) return next();
          response.setHeader('Content-Type', 'application/json');
          if (url.pathname.endsWith('/search')) {
            const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase();
            const name = (value: string | null) =>
              Boolean(query && value?.toLocaleLowerCase().includes(query));
            const data = url.pathname.includes('/second/')
              ? {
                  channels: [{ id: 'second-design', name: 'Design in another team' }],
                  conversations: [],
                  people: [],
                }
              : directory;
            response.end(
              JSON.stringify({
                channels: data.channels.filter((item) => name(item.name)),
                conversations: data.conversations.filter((item) =>
                  name(item.participant.displayName),
                ),
                people: data.people.filter((item) => name(item.displayName)),
              }),
            );
          } else if (url.pathname.endsWith('/direct-messages') && request.method === 'POST') {
            response.end(JSON.stringify({ id: 'dm-opened', workspaceId: 'first' }));
          } else response.end('[]');
        });
      },
    },
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '../../src') } },
  build: { outDir: '../../test-results/search-fixture', emptyOutDir: true },
  preview: { host: '127.0.0.1', port: 5570, strictPort: true },
});
