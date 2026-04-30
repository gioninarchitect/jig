import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-white/50 text-sm mb-6">The application encountered an error. Try refreshing the page.</p>
            <button onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg font-semibold transition">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
