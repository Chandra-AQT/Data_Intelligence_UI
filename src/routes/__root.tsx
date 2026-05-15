import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Component, type ReactNode, type ErrorInfo } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

function NotFoundComponent() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#060b18", padding: "1rem" }}>
      <div style={{ maxWidth: "28rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "4.5rem", fontWeight: 900, color: "#fff" }}>404</h1>
        <h2 style={{ marginTop: "1rem", fontSize: "1.25rem", fontWeight: 600, color: "#fff" }}>Page not found</h2>
        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>The page you're looking for doesn't exist.</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "0.5rem", backgroundColor: "#2563eb", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#060b18", padding: "1rem" }}>
      <div style={{ maxWidth: "32rem", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "4rem", height: "4rem", borderRadius: "1rem", backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", margin: "0 auto 1.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚠</span>
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fff", marginBottom: "0.5rem" }}>Something went wrong</h2>
        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>
          {error?.message ?? "An unexpected error occurred."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{ borderRadius: "0.75rem", backgroundColor: "#2563eb", padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: 700, color: "#fff", border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
          <Link to="/" style={{ borderRadius: "0.75rem", backgroundColor: "rgba(255,255,255,0.06)", padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Global error boundary wrapping the whole app
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("App error:", error, info); }
  render() {
    if (this.state.error) return <ErrorComponent error={this.state.error} />;
    return this.props.children;
  }
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ({ error }) => <ErrorComponent error={error as Error} />,
});

function RootComponent() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
