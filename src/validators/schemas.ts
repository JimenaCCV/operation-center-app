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

/** Al menos un campo con valor (los campos desconocidos ya se descartaron). */
const hasSomeField = (obj: Record<string, unknown>) => Object.values(obj).some((v) => v !== undefined);

export const updateActivitySchema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").max(200).optional(),
    course: z.union([z.null(), z.string().trim().min(1).max(100)]).optional(),
    brief: z.union([z.null(), z.string().trim().max(2000)]).optional(),
    // z.coerce.date() convierte null en 1970: el null se acepta aparte para «quitar la fecha».
    dueAt: z.union([z.null(), z.coerce.date()]).optional(),
    status: z.enum(["entregada", "cancelada"]).optional(),
  })
  .refine(hasSomeField, { message: "Envía al menos un campo: title, course, brief, dueAt o status" });
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

const stepTextSchema = z.string().trim().min(1, "El texto del paso es obligatorio").max(300);
const stepEstimateSchema = z.number().int().min(1).max(480);

export const addStepSchema = z.object({
  text: stepTextSchema,
  estimateMin: stepEstimateSchema.optional(),
});
export type AddStepInput = z.infer<typeof addStepSchema>;

export const updateStepBodySchema = z
  .object({
    done: z.boolean({ invalid_type_error: "done debe ser true o false" }).optional(),
    text: stepTextSchema.optional(),
    estimateMin: stepEstimateSchema.optional(),
  })
  .refine(hasSomeField, { message: "Envía al menos un campo: done, text o estimateMin" });
export type UpdateStepBody = z.infer<typeof updateStepBodySchema>;

export const planQuerySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(1440).default(30),
});
export type PlanQuery = z.infer<typeof planQuerySchema>;
