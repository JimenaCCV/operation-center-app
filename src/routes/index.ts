import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as activityController from "../controllers/activity.controller";
import * as planController from "../controllers/plan.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createActivitySchema,
  listActivitiesQuerySchema,
  loginSchema,
  planQuerySchema,
  registerSchema,
  setStepBodySchema,
} from "../validators/schemas";

export const api = Router();

api.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Feature 1 · Autenticación y roles
api.post("/auth/register", validate(registerSchema, "body"), asyncHandler(authController.register));
api.post("/auth/login", validate(loginSchema, "body"), asyncHandler(authController.login));
api.get("/auth/me", authenticate, asyncHandler(authController.me));
api.get("/users", authenticate, requireRole("admin"), asyncHandler(authController.listUsers));

// Feature 2 · Actividades con pasos
api.post("/activities", authenticate, validate(createActivitySchema, "body"), asyncHandler(activityController.create));
api.get("/activities/:id", authenticate, asyncHandler(activityController.getOne));
api.patch(
  "/activities/:id/steps/:stepId",
  authenticate,
  validate(setStepBodySchema, "body"),
  asyncHandler(activityController.setStep),
);

// Feature 3 · Listar y planear pendientes
api.get("/activities", authenticate, validate(listActivitiesQuerySchema, "query"), asyncHandler(activityController.list));
api.get("/plan", authenticate, validate(planQuerySchema, "query"), asyncHandler(planController.getPlan));
