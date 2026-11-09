// Tipos que reflejan lo que responde la API (ver README del back).
export const STATUSES = ["pendiente", "en_curso", "lista", "entregada", "cancelada"] as const;
export type Status = (typeof STATUSES)[number];

export const URGENCIES = ["vencida", "critica", "pronto", "holgada", "sin_fecha"] as const;
export type Urgency = (typeof URGENCIES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface Step {
  id: string;
  text: string;
  estimateMin: number;
  done: boolean;
  doneAt: string | null;
}

export interface Activity {
  id: string;
  title: string;
  course: string | null;
  brief: string | null;
  dueAt: string | null;
  status: Status;
  steps: Step[];
  urgency: Urgency;
  remainingMin: number;
  progress: { done: number; total: number };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityList {
  activities: Activity[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlannedStep {
  activityId: string;
  activityTitle: string;
  stepId: string;
  text: string;
  estimateMin: number;
  startsAtMin: number;
}

export interface SessionPlan {
  minutes: number;
  steps: PlannedStep[];
  totalMin: number;
  remaining: number;
}

export interface Summary {
  total: number;
  open: number;
  byStatus: Record<Status, number>;
  /** Solo actividades abiertas. */
  byUrgency: Record<Urgency, number>;
  pendingSteps: number;
  remainingMin: number;
  nextDue: { id: string; title: string; dueAt: string; urgency: Urgency } | null;
}

/** PATCH /api/activities/:id: al menos un campo; null quita el valor. */
export interface UpdateActivityInput {
  title?: string;
  course?: string | null;
  brief?: string | null;
  dueAt?: string | null;
  status?: "entregada" | "cancelada";
}

/** PATCH /api/activities/:id/steps/:stepId: al menos un campo. */
export interface StepPatch {
  done?: boolean;
  text?: string;
  estimateMin?: number;
}

export interface NewActivityInput {
  title: string;
  course?: string;
  brief?: string;
  dueAt?: string;
  steps: { text: string; estimateMin?: number }[];
}
