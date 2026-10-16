import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

/**
 * Valida `body` o `query` con un esquema zod.
 * - body: reemplaza req.body por el valor ya limpio y tipado.
 * - query: deja el valor limpio en res.locals.query (req.query conserva el original).
 */
export const validate =
  (schema: ZodTypeAny, source: "body" | "query") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(source === "body" ? req.body : req.query);
    if (!result.success) return next(result.error);
    if (source === "body") req.body = result.data;
    else res.locals.query = result.data;
    next();
  };

export type Validated<T extends ZodTypeAny> = z.infer<T>;
