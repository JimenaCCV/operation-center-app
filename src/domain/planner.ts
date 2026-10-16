import { isClosed, type ActivityStatus } from "./status";

export interface PlannableStep {
  id: string;
  text: string;
  estimateMin: number;
  done: boolean;
}

export interface PlannableActivity {
  id: string;
  title: string;
  status: ActivityStatus;
  dueAt: Date | null;
  /** Los pasos van en el orden en que deben hacerse. */
  steps: PlannableStep[];
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
  steps: PlannedStep[];
  totalMin: number;
  /** Pasos pendientes que no cupieron en esta sesión. */
  remaining: number;
}

/**
 * Arma una sesión del tamaño del tiempo disponible.
 * Orden: actividades con fecha más cercana primero (las que no tienen fecha, al final);
 * dentro de cada una, los pasos en su orden.
 * Si el siguiente paso de una actividad no cabe, sigue con otras actividades para llenar el tiempo,
 * pero sin saltarse pasos de la misma actividad.
 * Siempre incluye al menos un paso, aunque exceda el tiempo: empezar es lo que importa.
 */
export function planSession(activities: PlannableActivity[], minutes: number): SessionPlan {
  const open = activities
    .filter((a) => !isClosed(a.status))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));

  const pending = open.flatMap((a) => a.steps.filter((s) => !s.done).map((s) => ({ a, s })));

  const steps: PlannedStep[] = [];
  let total = 0;
  const blocked = new Set<string>();
  for (const { a, s } of pending) {
    if (blocked.has(a.id)) continue;
    if (steps.length > 0 && total + s.estimateMin > minutes) {
      blocked.add(a.id);
      continue;
    }
    steps.push({
      activityId: a.id,
      activityTitle: a.title,
      stepId: s.id,
      text: s.text,
      estimateMin: s.estimateMin,
      startsAtMin: total,
    });
    total += s.estimateMin;
  }
  return { steps, totalMin: total, remaining: pending.length - steps.length };
}
