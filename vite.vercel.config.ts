import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig(({ mode }) => {
    // Load .env file — this makes VITE_API_BASE from .env available
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
        css: {
            devSourcemap: false,
        },
        build: {
            outDir: "dist/spa",
            emptyOutDir: true,
            cssCodeSplit: false,
            rollupOptions: {
                input: path.resolve(__dirname, "index.html"),
            },
        },
        define: {
            "import.meta.env.VITE_API_BASE": JSON.stringify(
                env.VITE_API_BASE ?? "http://127.0.0.1:8000/api/v1"
            ),
        },
    };
});
