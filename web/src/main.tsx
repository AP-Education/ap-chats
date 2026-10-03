import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { isNativeShell } from './shared/lib/nativeBridge';
import { ErrorBoundary } from './shared/ui/ErrorBoundary/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
if (isNativeShell()) document.documentElement.dataset.nativeShell = 'true';

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary label="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
