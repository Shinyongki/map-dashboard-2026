import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function qnaServerPlugin(): Plugin {
    return {
        name: "qna-server",
        configureServer(server) {
            // Dynamically import to avoid esbuild bundling issues with server deps
            import("./src/server/qna-middleware").then(({ createQnAApp }) => {
                const qnaApp = createQnAApp();
                server.middlewares.use("/qna-api", qnaApp);
                console.log("✅ QnA API 서버가 /qna-api 에서 통합 실행 중입니다.");
            }).catch((err) => {
                console.error("❌ QnA 서버 로드 실패:", err);
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), qnaServerPlugin()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    server: {
        host: true,
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
            "/kakao-proxy": {
                target: "https://dapi.kakao.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/kakao-proxy/, ""),
            },
        },
    },
});
