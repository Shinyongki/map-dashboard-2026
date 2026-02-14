import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "https://jongsaja.vercel.app",
                changeOrigin: true,
            },
            "/kma-api": {
                target: "https://apihub.kma.go.kr",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/kma-api/, ""),
            },
            "/anthropic-api": {
                target: "https://api.anthropic.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/anthropic-api/, ""),
            },
        },
    },
});
