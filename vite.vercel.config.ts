import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
    plugins: [
        tanstackRouter({ target: "react", autoCodeSplitting: true }),
        react(),
        tailwindcss(),
        tsconfigPaths(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: "dist/client",
        emptyOutDir: true,
    },
    define: {
        // Expose env vars to the app
        "import.meta.env.VITE_API_BASE": JSON.stringify(
            process.env.VITE_API_BASE ?? "https://ai-data-intelligence-1.onrender.com/api/v1"
        ),
    },
});
