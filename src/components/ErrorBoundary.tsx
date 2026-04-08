import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen aurora-bg flex items-center justify-center p-8">
          <div className="glass-panel p-10 rounded-[2.5rem] border-red-500/20 max-w-lg text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Neural Studio Error</h2>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 text-left">
              <p className="text-red-400 font-mono text-xs break-all leading-relaxed whitespace-pre-wrap">
                {this.state.error?.toString() || "Unknown unhandled exception"}
              </p>
            </div>
            <p className="text-slate-400 mb-8 font-medium leading-relaxed text-sm">
              Please click 'Hard Reset' below to clear your local cache and restore the studio.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                REFRESH PAGE
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
              >
                HARD RESET (CLEAR ALL CACHE)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
