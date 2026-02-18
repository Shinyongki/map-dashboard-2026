import dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express from "express";
import cors from "cors";
import { initializeFirebase, isFirebaseConfigured } from "./firebase";
import authRouter from "./routes/auth";
import questionsRouter from "./routes/questions";
import documentsRouter from "./routes/documents";
import noticesRouter from "./routes/notices";

// Initialize Firebase
initializeFirebase();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/notices", noticesRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    firebase: isFirebaseConfigured(),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`QnA Server running on http://localhost:${PORT}`);
  console.log(`Firebase: ${isFirebaseConfigured() ? "configured" : "mock mode"}`);
  console.log(
    `Anthropic: ${process.env.ANTHROPIC_API_KEY ? "configured" : "mock mode"}`
  );
});
