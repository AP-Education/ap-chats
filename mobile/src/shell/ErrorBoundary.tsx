import { Component, type PropsWithChildren, type ReactNode } from 'react';

interface ErrorBoundaryProps extends PropsWithChildren {
  /** Logged alongside the error so it's clear which boundary caught it. */
  label: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Scoped to one subtree, not the whole app: a crash in e.g. CallSession
 * shouldn't take WebViewHost down with it. Logs loudly (shows up in the Metro/
 * debug console) instead of failing silently, and degrades to `fallback`
 * (null by default) rather than leaving the rest of the screen blank too. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error(`[${this.props.label}] crashed`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
