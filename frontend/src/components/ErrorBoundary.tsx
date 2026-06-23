import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--danger)' }}>Something went wrong</h2>
            <p className="mb-4 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 font-mono text-xs uppercase tracking-wider border"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(180, 170, 150, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
