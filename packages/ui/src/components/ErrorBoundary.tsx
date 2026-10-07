import { Button, Result } from 'antd';
import { Component, type PropsWithChildren, type ReactNode } from 'react';

interface ErrorBoundaryProps extends PropsWithChildren {
  /** Logged alongside the error so it's clear which boundary caught it. */
  label: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** A render crash anywhere below this used to leave #root empty with nothing
 * in the DOM to explain why — this logs loudly and shows something recoverable
 * instead of silently going blank. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error(`[${this.props.label}] crashed`, error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback ?? (
        <Result
          status="error"
          title="Щось пішло не так"
          subTitle="Спробуйте перезавантажити сторінку."
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Перезавантажити
            </Button>
          }
        />
      )
    );
  }
}
