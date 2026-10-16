import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Envuelve un handler async para que cualquier error llegue al middleware de errores (Express 4 no lo hace solo). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
