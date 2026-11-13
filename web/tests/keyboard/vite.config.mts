import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const shellRoot = process.env.AP_APP_QA_ROOT;

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  cacheDir: path.resolve(import.meta.dirname, '../../node_modules/.vite-keyboard'),
  plugins: [
    react(),
    {
      name: 'keyboard-production-shell',
      resolveId: (id) => (id === 'virtual:keyboard-shell' ? '\0keyboard-shell' : undefined),
      load: (id) => {
        if (id !== '\0keyboard-shell') return;
        if (!shellRoot) throw new Error('AP_APP_QA_ROOT is required for native.html');
        const source = path.join(
          shellRoot,
          'host/src/features/layout/hooks/useNativeKeyboardInset.ts',
        );
        return `export { useNativeKeyboardInset } from ${JSON.stringify(source)};`;
      },
    },
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '../../src') },
    dedupe: ['react', 'react-dom', '@ap-education/shell-sdk'],
  },
  server: {
    host: '127.0.0.1',
    port: 5582,
    strictPort: true,
    fs: {
      allow: [path.resolve(import.meta.dirname, '../../..'), ...(shellRoot ? [shellRoot] : [])],
    },
    proxy: { '/api': 'http://127.0.0.1:5572' },
  },
});
