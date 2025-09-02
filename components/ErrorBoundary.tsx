import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 text-red-800 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white border border-red-200 rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
            <p className="mb-6">An unexpected error occurred, which is preventing the application from rendering.</p>
            <details className="text-left bg-red-50 p-4 rounded-md">
              <summary className="cursor-pointer font-semibold">Error Details</summary>
              <pre className="mt-4 text-sm whitespace-pre-wrap break-all">
                {this.state.error?.toString()}
                <br />
                {this.state.error?.stack}
              </pre>
            </details>
             <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try to reload component
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;