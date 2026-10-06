import { sharedSingletons } from '@ap/federation';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {},
      shared: sharedSingletons(pkg),
      dts: false,
    }),
  ],
  server: {
    host: true,
    port: 5556,
    proxy: {
      '/api': 'http://localhost:3211',
      '/socket.io': { target: 'http://localhost:3211', ws: true, changeOrigin: true },
    },
  },
  build: { target: 'esnext' },
});
