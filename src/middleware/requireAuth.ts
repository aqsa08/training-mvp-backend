// src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAuthToken, AuthTokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"];

  // 👇 TEMP debug: see which routes are going through requireAuth
  console.log("requireAuth ->", req.method, req.path, "Authorization:", header);

  if (!header) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization header" });
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = payload;
    return next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}