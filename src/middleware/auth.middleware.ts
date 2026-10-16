import type { NextFunction, Request, Response } from "express";
import type { Role } from "../models/user.model";
import { verifyToken } from "../services/auth.service";
import { HttpError } from "../utils/httpError";

/** Exige `Authorization: Bearer <jwt>` válido y deja la identidad en `req.user`. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "Falta el token: envía Authorization: Bearer <token>"));
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch (e) {
    next(e);
  }
}

/** Autorización por rol. Se usa después de `authenticate`. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new HttpError(401, "No autenticado"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "No tienes permisos para esta operación"));
    next();
  };
