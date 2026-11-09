import type { Request, RequestHandler } from "express";
import rateLimit, { type RateLimitInfo } from "express-rate-limit";

export interface AuthLimiterOptions {
  windowMs: number;
  max: number;
  /** En login: los intentos exitosos no cuentan, solo los fallidos. */
  skipSuccessfulRequests?: boolean;
}

/**
 * Límite de intentos por IP. Al superarlo responde 429 con el formato de errores del proyecto
 * y el encabezado Retry-After (segundos hasta que se libera la ventana).
 */
export function createAuthLimiter({ windowMs, max, skipSuccessfulRequests = false }: AuthLimiterOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      // express-rate-limit deja la información del límite en req.rateLimit.
      const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
      const resetAt = info?.resetTime?.getTime() ?? Date.now() + options.windowMs;
      const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
      res.status(options.statusCode).json({
        error: { message: `Demasiados intentos. Intenta de nuevo en ${minutes} minuto(s).` },
      });
    },
  });
}

/** No hace nada: se usa en NODE_ENV=test, donde las pruebas hacen muchos logins seguidos. */
export const noLimit: RequestHandler = (_req, _res, next) => next();
