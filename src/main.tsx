import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { getRouter } from "./router";
import "./styles.css";

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

const router = getRouter();

const rootEl = document.getElementById("root");
if (rootEl) {
    createRoot(rootEl).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
                <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            </QueryClientProvider>
        </StrictMode>
    );
}
