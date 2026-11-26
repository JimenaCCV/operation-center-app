import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

const BODY_ERROR_MESSAGES: Record<string, string> = {
  "entity.parse.failed": "El body no es un JSON válido",
  "entity.too.large": "El body supera el tamaño máximo permitido (100 kb)",
  "charset.unsupported": "Charset no soportado: envía el body en UTF-8",
  "encoding.unsupported": "Content-Encoding no soportado",
};

/**
 * body-parser marca sus errores con un `status` 4xx y `type` (o `expose: true`, como el gzip inválido).
 * Antes solo se reconocía el JSON mal formado y el resto (por ejemplo un body de más de 100 kb) terminaba en 500.
 */
function bodyParserError(err: unknown): { status: number; message: string } | null {
  if (typeof err !== "object" || err === null) return null;
  const { type, status, expose } = err as { type?: unknown; status?: unknown; expose?: unknown };
  if (typeof status !== "number" || status < 400 || status >= 500) return null;
  if (typeof type !== "string" && expose !== true) return null;
  const message = typeof type === "string" ? BODY_ERROR_MESSAGES[type] : undefined;
  return { status, message: message ?? "No se pudo leer el body de la petición" };
}

/** Convierte cualquier error en una respuesta JSON uniforme: { error: { message, details? } }. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    res.status(400).json({ error: { message: "Datos inválidos", details } });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, ...(err.details ? { details: err.details } : {}) } });
    return;
  }
  // Errores al leer el body (los lanza express.json): JSON mal formado, demasiado grande, charset o encoding.
  const bodyError = bodyParserError(err);
  if (bodyError) {
    res.status(bodyError.status).json({ error: { message: bodyError.message } });
    return;
  }
  if (env.NODE_ENV !== "test") console.error(err);
  res.status(500).json({ error: { message: "Error interno del servidor" } });
};
