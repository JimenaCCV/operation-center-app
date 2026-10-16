/**
 * Reglas de dominio puras (sin Express ni Mongoose), adaptadas de packages/core de OP-JCCV.
 * Al ser funciones puras se prueban sin base de datos.
 */

/** Estados de una actividad, en el orden en que normalmente avanza. */
export const ACTIVITY_STATUSES = ["pendiente", "en_curso", "lista", "entregada", "cancelada"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/** Estados que ya no cuentan como pendientes. */
export const CLOSED_STATUSES = ["entregada", "cancelada"] as const satisfies readonly ActivityStatus[];

export const isClosed = (s: ActivityStatus): boolean => (CLOSED_STATUSES as readonly string[]).includes(s);

export interface StepLike {
  done: boolean;
  estimateMin: number;
}

/** Estado que corresponde según los pasos, sin retroceder una actividad ya cerrada. */
export function deriveStatus(current: ActivityStatus, steps: Pick<StepLike, "done">[]): ActivityStatus {
  if (isClosed(current)) return current;
  if (steps.length === 0) return current;
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return "lista";
  if (done > 0) return "en_curso";
  return current === "lista" ? "en_curso" : current;
}

/** Minutos que faltan para terminar una actividad. */
export function remainingMinutes(steps: StepLike[]): number {
  return steps.filter((s) => !s.done).reduce((n, s) => n + s.estimateMin, 0);
}
