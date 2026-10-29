import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { fixtureApi } from './fixture-api.ts';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    react(),
    {
      name: 'fixture-attachment-api',
      configureServer: fixtureApi,
      configurePreviewServer: fixtureApi,
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
