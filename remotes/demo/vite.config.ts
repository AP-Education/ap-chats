import { sharedSingletons } from '@ap/federation';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

const PORT = 5558;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'demo',
      filename: 'remoteEntry.js',
      exposes: { './module': './src/module.tsx' },
      shared: sharedSingletons(pkg),
      dts: false,
    }),
  ],
  server: { port: PORT, origin: `http://localhost:${PORT}`, cors: true },
  preview: { port: PORT, cors: true },
  build: { target: 'esnext' },
});
