import { z } from "zod";
import { ACTIVITY_STATUSES } from "../domain/status";
import { URGENCY_LEVELS } from "../domain/urgency";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  course: z.string().trim().min(1).max(100).optional(),
  brief: z.string().trim().max(2000).optional(),
  dueAt: z.coerce.date().optional(),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(300),
        estimateMin: z.number().int().min(1).max(480).optional(),
      }),
    )
    .max(50)
    .default([]),
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const listActivitiesQuerySchema = z.object({
  course: z.string().trim().min(1).max(100).optional(),
  status: z.enum(ACTIVITY_STATUSES).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;

export const setStepBodySchema = z.object({
  done: z.boolean({ required_error: "done es obligatorio", invalid_type_error: "done debe ser true o false" }),
});
export type SetStepBody = z.infer<typeof setStepBodySchema>;

export const planQuerySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(1440).default(30),
});
export type PlanQuery = z.infer<typeof planQuerySchema>;
