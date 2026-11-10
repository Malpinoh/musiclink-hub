import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";

type RouteErrorBoundaryProps = { children: ReactNode };
type RouteErrorBoundaryState = { hasError: boolean };

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep technical details in the browser console for debugging; never expose them to visitors.
    console.error("MDistro Link page error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
          <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
              !
            </div>
            <h1 className="text-xl font-semibold text-foreground">We hit a temporary issue</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Our team is working on it. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default function GlobalErrorNotice() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const showError = () => setHasError(true);

    const handleWindowError = (event: ErrorEvent) => {
      // Ignore browser cancellations; they are expected during navigation and component cleanup.
      if (event.error?.name === "AbortError") return;
      showError();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason?.name === "AbortError" || reason?.name === "CanceledError") return;
      showError();
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (!hasError) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="min-w-0">
        <span className="font-semibold">We encountered a temporary issue.</span>{" "}
        Our team is working on it. Please try again shortly.
      </p>
      <button
        type="button"
        onClick={() => setHasError(false)}
        aria-label="Dismiss error notification"
        className="shrink-0 rounded-md px-2 py-1 font-medium hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:hover:bg-amber-900"
      >
        Dismiss
      </button>
    </div>
  );
}
