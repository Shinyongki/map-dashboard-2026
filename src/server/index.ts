/**
 * Production server entry point (Railway deployment)
 * Serves built frontend (dist/) + QnA API
 */
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createQnAApp } from "./qna-middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(__dirname, "../../dist");

const app = express();

// ── QnA API (노마·세나·RAG 등 전체) ──
app.use("/qna-api", createQnAApp());

// ── 외부 API 프록시 (Vite dev 서버 프록시 대체) ──
app.use(
    "/api",
    createProxyMiddleware({
        target: "https://jongsaja.vercel.app",
        changeOrigin: true,
        pathRewrite: { "^/": "/api/" }, // Express strips /api prefix — restore it
    })
);
app.use(
    "/kma-api",
    createProxyMiddleware({
        target: "https://apihub.kma.go.kr",
        changeOrigin: true,
        pathRewrite: { "^/kma-api": "" },
    })
);
app.use(
    "/kakao-proxy",
    createProxyMiddleware({
        target: "https://dapi.kakao.com",
        changeOrigin: true,
        pathRewrite: { "^/kakao-proxy": "" },
    })
);
app.use(
    "/anthropic-api",
    createProxyMiddleware({
        target: "https://api.anthropic.com",
        changeOrigin: true,
        pathRewrite: { "^/anthropic-api": "" },
    })
);

// ── 정적 파일 서빙 (빌드된 React 앱) ──
app.use(express.static(DIST_DIR));

// ── SPA 폴백 (모든 경로 → index.html) ──
app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
});

createServer(app).listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
