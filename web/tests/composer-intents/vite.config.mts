import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  cacheDir: path.resolve(import.meta.dirname, '../../node_modules/.vite-composer-intents'),
  plugins: [
    react(),
    {
      name: 'synthetic-composer-api',
      configureServer(server) {
        server.middlewares.use('/api', (request, response) => {
          const isPolicy = request.url?.endsWith('/uploads/policy');
          const result = isPolicy
            ? { maxFiles: 10, maxFileBytes: 1000000, maxMessageBytes: 10000000, partBytes: 1000000 }
            : [];
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(result));
        });
      },
    },
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '../../src') } },
  server: { host: '127.0.0.1', port: 5587, strictPort: true },
});
