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

/** Máximo de pasos que admite una actividad. */
export const MAX_STEPS = 50;

/** Resultado de una regla que puede rechazar un cambio (el servicio lo convierte en 409). */
export type RuleResult = { ok: true } | { ok: false; message: string };

const OK: RuleResult = { ok: true };
export const CLOSED_MESSAGE = "La actividad está cerrada y no se puede modificar";

/** Una actividad cerrada no acepta cambios en sus datos ni en sus pasos (solo marcar/desmarcar o borrarla). */
export function checkEditable(current: ActivityStatus): RuleResult {
  return isClosed(current) ? { ok: false, message: CLOSED_MESSAGE } : OK;
}

/** ¿Se puede agregar un paso más? Respeta el cierre y el máximo de pasos. */
export function checkAddStep(current: ActivityStatus, stepCount: number): RuleResult {
  const editable = checkEditable(current);
  if (!editable.ok) return editable;
  if (stepCount >= MAX_STEPS) return { ok: false, message: `Una actividad admite máximo ${MAX_STEPS} pasos` };
  return OK;
}

/**
 * ¿Se puede cerrar a mano? `cancelada` siempre que esté abierta;
 * `entregada` solo si no quedan pasos pendientes (o no tiene pasos).
 */
export function checkClose(
  current: ActivityStatus,
  target: (typeof CLOSED_STATUSES)[number],
  steps: Pick<StepLike, "done">[],
): RuleResult {
  const editable = checkEditable(current);
  if (!editable.ok) return editable;
  if (target === "entregada") {
    const pending = steps.filter((s) => !s.done).length;
    if (pending > 0) return { ok: false, message: `Faltan ${pending} paso(s) por completar` };
  }
  return OK;
}

/**
 * Estado después de agregar o quitar pasos: sin pasos vuelve a `pendiente`;
 * si no, se deriva de los pasos (agregar uno a una actividad `lista` la regresa a `en_curso`).
 */
export function statusAfterStepEdit(current: ActivityStatus, steps: Pick<StepLike, "done">[]): ActivityStatus {
  if (isClosed(current)) return current;
  if (steps.length === 0) return "pendiente";
  return deriveStatus(current, steps);
}
