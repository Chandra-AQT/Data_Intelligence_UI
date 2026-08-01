import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [
            TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
            react(),
            tailwindcss(),
            tsconfigPaths(),
        ],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        optimizeDeps: {
            exclude: ["pdfjs-dist"],
        },
        build: {
            outDir: "dist",
            emptyOutDir: true,
            rollupOptions: {
                input: path.resolve(__dirname, "index.html"),
                output: {
                    manualChunks: {
                        "pdf-worker": ["pdfjs-dist"],
                        "react-pdf": ["react-pdf"],
                    },
                },
            },
        },
        define: {
            "import.meta.env.VITE_API_BASE": JSON.stringify(
                env.VITE_API_BASE ?? "https://data-intelligence-production.up.railway.app/api/v1"
            ),
        },
        // Allow all hosts — required for Railway, Vercel, Render, etc.
        preview: {
            allowedHosts: "all",
            host: "0.0.0.0",
            port: parseInt(env.PORT ?? "4173"),
        },
        server: {
            allowedHosts: "all",
            host: "0.0.0.0",
        },
    };
});
