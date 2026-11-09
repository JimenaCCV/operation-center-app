import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as activityController from "../controllers/activity.controller";
import * as planController from "../controllers/plan.controller";
import * as summaryController from "../controllers/summary.controller";
import { env } from "../config/env";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { createAuthLimiter, noLimit } from "../middleware/rate-limit.middleware";
import { validate } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  addStepSchema,
  createActivitySchema,
  listActivitiesQuerySchema,
  loginSchema,
  planQuerySchema,
  registerSchema,
  updateActivitySchema,
  updateStepBodySchema,
} from "../validators/schemas";

export const api = Router();

api.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Feature 6 · Límite de intentos (desactivado en pruebas: las de API hacen muchos logins)
const limiterOptions = { windowMs: env.RATE_LIMIT_WINDOW_MIN * 60_000, max: env.RATE_LIMIT_MAX };
const loginLimiter =
  env.NODE_ENV === "test" ? noLimit : createAuthLimiter({ ...limiterOptions, skipSuccessfulRequests: true });
const registerLimiter = env.NODE_ENV === "test" ? noLimit : createAuthLimiter(limiterOptions);

// Feature 1 · Autenticación y roles
api.post("/auth/register", registerLimiter, validate(registerSchema, "body"), asyncHandler(authController.register));
api.post("/auth/login", loginLimiter, validate(loginSchema, "body"), asyncHandler(authController.login));
api.get("/auth/me", authenticate, asyncHandler(authController.me));
api.get("/users", authenticate, requireRole("admin"), asyncHandler(authController.listUsers));

// Feature 2 · Actividades con pasos
api.post("/activities", authenticate, validate(createActivitySchema, "body"), asyncHandler(activityController.create));
api.get("/activities/:id", authenticate, asyncHandler(activityController.getOne));
api.patch(
  "/activities/:id/steps/:stepId",
  authenticate,
  validate(updateStepBodySchema, "body"),
  asyncHandler(activityController.updateStep),
);

// Feature 4 · Edición y borrado de actividades y pasos
api.patch(
  "/activities/:id",
  authenticate,
  validate(updateActivitySchema, "body"),
  asyncHandler(activityController.update),
);
api.delete("/activities/:id", authenticate, asyncHandler(activityController.remove));
api.post("/activities/:id/steps", authenticate, validate(addStepSchema, "body"), asyncHandler(activityController.addStep));
api.delete("/activities/:id/steps/:stepId", authenticate, asyncHandler(activityController.removeStep));

// Feature 3 · Listar y planear pendientes
api.get("/activities", authenticate, validate(listActivitiesQuerySchema, "query"), asyncHandler(activityController.list));
api.get("/plan", authenticate, validate(planQuerySchema, "query"), asyncHandler(planController.getPlan));

// Feature 5 · Resumen de carga
api.get("/summary", authenticate, asyncHandler(summaryController.getSummary));
