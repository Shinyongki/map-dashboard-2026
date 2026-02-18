import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload, UserRole } from "../types";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "qna-system-secret-2026";
const ADMIN_CODE = process.env.ADMIN_CODE || "1672";

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

  const role = resolveRole(orgCode);
  const payload: JwtPayload = { orgCode, name, orgName, role };
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
