import './index.css';

import { isNativeShell } from '@ap/shell-sdk';
import { ErrorBoundary } from '@ap/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { preloadApps } from '@/features/apps/api/preload-apps';

import { App } from './app/App';
import { apps } from './app/apps';
import { BootstrapHandoff } from './app/BootstrapHandoff';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
if (isNativeShell()) document.documentElement.dataset.nativeShell = 'true';

preloadApps(apps, window.location.pathname);

createRoot(root).render(
  <StrictMode>
    <BootstrapHandoff />
    <ErrorBoundary label="shell">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
