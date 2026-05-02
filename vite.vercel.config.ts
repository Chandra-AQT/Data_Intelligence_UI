import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
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
        // Ensure CSS is processed correctly
        devSourcemap: false,
    },
    build: {
        outDir: "dist/spa",
        emptyOutDir: true,
        cssCodeSplit: false, // Bundle all CSS into one file
        rollupOptions: {
            input: path.resolve(__dirname, "index.html"),
        },
    },
    define: {
        "import.meta.env.VITE_API_BASE": JSON.stringify(
            process.env.VITE_API_BASE ?? "https://ai-data-intelligence-1.onrender.com/api/v1"
        ),
    },
});
