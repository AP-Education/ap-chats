import './index.css';

import { isNativeShell } from '@ap/shell-sdk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { BootstrapHandoff } from './app/BootstrapHandoff';
import { ErrorBoundary } from './app/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
if (isNativeShell()) document.documentElement.dataset.nativeShell = 'true';

createRoot(root).render(
  <StrictMode>
    <BootstrapHandoff />
    <ErrorBoundary label="shell">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
