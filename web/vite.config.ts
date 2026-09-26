import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    host: true,
    port: 5555,
    proxy: {
      '/api': 'http://localhost:3211',
      '/socket.io': { target: 'http://localhost:3211', ws: true, changeOrigin: true },
    },
  },
});
