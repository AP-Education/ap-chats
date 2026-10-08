import path from 'node:path';

import { sharedSingletons } from '@ap-education/federation';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Link previews only load absolute image URLs, so release builds pass the public origin; elsewhere it stays relative.
const appOrigin: Plugin = {
  name: 'app-origin',
  config: (_, { mode }) => ({
    define: {
      'import.meta.env.VITE_APP_ORIGIN': JSON.stringify(
        loadEnv(mode, import.meta.dirname).VITE_APP_ORIGIN ?? '',
      ),
    },
  }),
};

import pkg from './package.json' with { type: 'json' };

const PORT = 5557;

// Chats is a remote: the shell owns the document, auth, theme and router.
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  plugins: [
    react(),
    appOrigin,
    federation({
      name: 'chats',
      filename: 'remoteEntry.js',
      exposes: { './module': './src/module.tsx' },
      shared: sharedSingletons(pkg),
      dts: false,
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: { port: PORT, origin: `http://localhost:${PORT}`, cors: true },
  preview: { port: PORT, cors: true },
  build: { target: 'esnext' },
});
