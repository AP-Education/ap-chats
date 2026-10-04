import { defineConfig, mergeConfig } from 'vite';

import rootConfig from '../../vite.config.ts';

// Shares the app's own alias/plugin setup instead of re-declaring it, so the
// two can't silently drift apart.
export default defineConfig(
  mergeConfig(rootConfig, {
    root: import.meta.dirname,
    server: { host: '127.0.0.1', port: 5567, strictPort: true },
  }),
);
