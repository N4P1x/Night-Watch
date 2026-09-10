import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`ErrorBoundary${this.props.label ? ` (${this.props.label})` : ''} caught:`, error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="nw-panel m-6 p-10 text-center" role="alert">
          <p className="nw-eyebrow">Something broke</p>
          <h2 className="nw-h1 mt-1">This panel crashed</h2>
          <p className="nw-mono mt-2 text-ink-500 break-all">
            {this.state.error?.message || 'Unexpected render error'}
            {this.props.label ? ` · ${this.props.label}` : ''}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => this.setState({ hasError: false, error: null })} className="btn btn-secondary">
              Try again
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-ghost">
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
