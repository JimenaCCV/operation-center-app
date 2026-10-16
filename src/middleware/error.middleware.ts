import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

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
  // JSON mal formado en el body (lo lanza express.json)
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: { message: "El body no es un JSON válido" } });
    return;
  }
  if (env.NODE_ENV !== "test") console.error(err);
  res.status(500).json({ error: { message: "Error interno del servidor" } });
};
