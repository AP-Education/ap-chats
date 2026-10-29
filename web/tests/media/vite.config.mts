import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type ViteDevServer } from 'vite';

function attachmentApi(server: Pick<ViteDevServer, 'middlewares'>) {
  server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    const request = new URL(req.url, 'http://localhost');
    res.setHeader('Content-Type', 'application/json');
    if (request.pathname.endsWith('/policy')) {
      res.end(
        JSON.stringify({
          maxFileBytes: 1_000_000_000,
          maxMessageBytes: 1_000_000_000,
          maxFiles: 10,
          partBytes: 8 * 1024 * 1024,
        }),
      );
      return;
    }
    if (!request.pathname.endsWith('/url')) {
      res.end('[]');
      return;
    }
    const portrait = req.headers.referer?.includes('portrait');
    const prefix = portrait ? 'portrait' : 'sample';
    const variant = request.searchParams.get('variant');
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({ url: `/media/${prefix}.${variant === 'thumbnail' ? 'webp' : 'mp4'}` }),
    );
  });
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    react(),
    {
      name: 'fixture-attachment-api',
      configureServer: attachmentApi,
      configurePreviewServer: attachmentApi,
    },
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '../../src') } },
  build: {
    outDir: path.resolve(import.meta.dirname, '../../../test-results/media-fixture'),
    emptyOutDir: true,
  },
  preview: { host: '127.0.0.1', port: 5568, strictPort: true },
  server: {
    host: '127.0.0.1',
    port: 5568,
    strictPort: true,
    fs: { allow: [path.resolve(import.meta.dirname, '../../../')] },
  },
});
