import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

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

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </QueryClientProvider>
  );
}
