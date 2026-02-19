import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function qnaServerPlugin(): Plugin {
    return {
        name: "qna-server",
        configureServer(server) {
            // Load environment variables from .env files
            const env = loadEnv("development", process.cwd(), "");

            // Inject essential variables into process.env for the middleware
            process.env.GOOGLE_GEMINI_API_KEY = env.GOOGLE_GEMINI_API_KEY;
            process.env.FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;
            process.env.FIREBASE_CLIENT_EMAIL = env.FIREBASE_CLIENT_EMAIL;
            process.env.FIREBASE_PRIVATE_KEY = env.FIREBASE_PRIVATE_KEY;
            process.env.FIREBASE_STORAGE_BUCKET = env.FIREBASE_STORAGE_BUCKET;
            process.env.JWT_SECRET = env.JWT_SECRET;
            process.env.ADMIN_CODE = env.ADMIN_CODE;
            process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

            // Dynamically import to avoid esbuild bundling issues with server deps
            import("./src/server/qna-middleware").then(({ createQnAApp }) => {
                const qnaApp = createQnAApp();
                server.middlewares.use("/qna-api", qnaApp);
                console.log("✅ QnA API 서버가 /qna-api 에서 통합 실행 중이며, 환경 변수가 로드되었습니다.");
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
        port: 5182,
        host: true,
        watch: {
            ignored: ["**/server-*-data.json", "server-*-data.json"],
        },
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
