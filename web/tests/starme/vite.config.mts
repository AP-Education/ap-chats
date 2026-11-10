import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '../../src') } },
  server: {
    host: '127.0.0.1',
    port: 5575,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:5576' },
  },
});
