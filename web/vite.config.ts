import path from 'node:path';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), appOrigin],
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
