import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { BootstrapHandoff } from './app/BootstrapHandoff';
import { ErrorBoundary } from './shared/ui/ErrorBoundary/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <BootstrapHandoff />
    <ErrorBoundary label="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
