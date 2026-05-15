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
        css: {
            devSourcemap: false,
        },
        optimizeDeps: {
            // Exclude pdfjs-dist from pre-bundling — it uses browser-only APIs
            exclude: ["pdfjs-dist"],
        },
        build: {
            outDir: "dist/spa",
            emptyOutDir: true,
            cssCodeSplit: false,
            rollupOptions: {
                input: path.resolve(__dirname, "index.html"),
                output: {
                    // Put pdfjs in its own chunk so it doesn't block initial load
                    manualChunks: {
                        "pdf-worker": ["pdfjs-dist"],
                        "react-pdf": ["react-pdf"],
                    },
                },
            },
        },
        define: {
            "import.meta.env.VITE_API_BASE": JSON.stringify(
                env.VITE_API_BASE ?? "http://127.0.0.1:8000/api/v1"
            ),
        },
    };
});
