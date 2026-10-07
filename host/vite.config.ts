import path from 'node:path';

import { sharedSingletons } from '@ap/federation';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import pkg from './package.json' with { type: 'json' };

/**
 * Lets the browser fetch every remote's entry while the host bundle still loads,
 * instead of after it runs. Remote URLs are build-time configuration.
 */
function preloadRemoteEntries(remoteUrls: string[]): Plugin {
  return {
    name: 'preload-remote-entries',
    transformIndexHtml: () =>
      remoteUrls.flatMap((url) => [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: new URL(url).origin, crossorigin: '' },
          injectTo: 'head-prepend' as const,
        },
        {
          tag: 'link',
          attrs: { rel: 'modulepreload', href: `${url}/remoteEntry.js`, crossorigin: '' },
          injectTo: 'head' as const,
        },
      ]),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_MFE_');
  const remoteUrls = Object.values(env)
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return {
    plugins: [
      react(),
      preloadRemoteEntries(remoteUrls),
      federation({
        name: 'host',
        remotes: {},
        shared: sharedSingletons(pkg),
        dts: false,
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      host: true,
      port: 5556,
      proxy: {
        '/api': 'http://localhost:3211',
        '/socket.io': { target: 'http://localhost:3211', ws: true, changeOrigin: true },
      },
    },
    build: { target: 'esnext' },
  };
});
