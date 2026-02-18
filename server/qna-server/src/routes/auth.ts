import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import type { JwtPayload, UserRole } from "../types";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "qna-system-secret-2026";
const ADMIN_CODE = process.env.ADMIN_CODE || "1672";

// Load agencies data
const AGENCIES_PATH = path.resolve(__dirname, "../../data/agencies.json");
let AGENCIES: any[] = [];

try {
  const data = fs.readFileSync(AGENCIES_PATH, "utf-8");
  AGENCIES = JSON.parse(data);
  console.log(`Loaded ${AGENCIES.length} agencies for authentication.`);
} catch (error) {
  console.error("Failed to load agencies.json:", error);
}

function resolveRole(orgCode: string): UserRole {
  return orgCode === ADMIN_CODE ? "admin" : "user";
}

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  const { orgCode, name, orgName } = req.body;

  if (!orgCode || !name || !orgName) {
    res.status(400).json({ error: "모든 항목을 입력해주세요." });
    return;
  }

  // Admin login Bypass
  if (orgCode === ADMIN_CODE) {
    const payload: JwtPayload = { orgCode, name, orgName, role: "admin" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: payload });
    return;
  }

  // Verify Agency Code
  const agency = AGENCIES.find((a) => a.orgCode === orgCode);
  if (!agency) {
    res.status(401).json({ error: "존재하지 않는 기관코드입니다." });
    return;
  }

  // Verify Agency Name (Optional: Relaxed check or exact match)
  // For better UX, we might just use the official name from our DB if the code matches
  const officialOrgName = agency.orgName;

  const payload: JwtPayload = {
    orgCode,
    name,
    orgName: officialOrgName, // Use the official name from DB
    role: "user"
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    user: payload,
  });
});

// Middleware: JWT verification
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "인증이 필요합니다." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "유효하지 않은 토큰입니다." });
  }
}

// Middleware: Admin check
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user as JwtPayload | undefined;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return;
  }
  next();
}

export default router;
