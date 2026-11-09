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
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-color)] p-6 text-[var(--text-color)]">
          <div role="alert" className="w-full max-w-md rounded-2xl glass-panel p-8">
            <h2 className="text-xl font-medium tracking-tight">Something went wrong</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-color)]">
              POSTL hit an error it couldn't recover from. Reloading usually fixes it. If it keeps happening, clear the
              data saved in this browser and reload.
            </p>
            <pre className="mt-6 whitespace-pre-wrap break-all rounded-lg border border-danger/25 bg-danger/5 p-4 font-mono text-xs leading-relaxed text-[var(--danger)]">
              {import.meta.env.PROD
                ? "Something went wrong while loading POSTL. No private diagnostic details are shown in production."
                : this.state.error?.toString() || "Unknown unhandled exception"}
            </pre>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="h-10 w-full rounded-lg bg-[var(--text-color)] text-sm font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85"
              >
                Reload page
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="h-10 w-full rounded-lg border border-[var(--hairline-strong)] text-sm text-[var(--muted-color)] transition-colors duration-150 hover:text-[var(--danger)]"
              >
                Clear local data and reload
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
