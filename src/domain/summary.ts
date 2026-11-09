/**
 * Resumen de carga: regla pura (sin Express ni Mongoose) sobre las actividades de una persona.
 */
import { ACTIVITY_STATUSES, isClosed, remainingMinutes, type ActivityStatus, type StepLike } from "./status";
import { URGENCY_LEVELS, urgency, type Urgency } from "./urgency";

export interface SummaryActivity {
  id: string;
  title: string;
  status: ActivityStatus;
  dueAt: Date | null;
  steps: StepLike[];
}

export interface Summary {
  total: number;
  open: number;
  byStatus: Record<ActivityStatus, number>;
  byUrgency: Record<Urgency, number>;
  pendingSteps: number;
  remainingMin: number;
  nextDue: { id: string; title: string; dueAt: Date; urgency: Urgency } | null;
}

const zeros = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/**
 * - `byStatus` cuenta todas las actividades.
 * - `byUrgency`, `pendingSteps` y `remainingMin` cuentan solo las abiertas.
 * - `nextDue` es la abierta con la fecha futura más cercana (`dueAt >= now`); las vencidas no cuentan.
 */
export function summarize(activities: SummaryActivity[], now: Date): Summary {
  const byStatus = zeros(ACTIVITY_STATUSES);
  const byUrgency = zeros(URGENCY_LEVELS);
  let open = 0;
  let pendingSteps = 0;
  let remainingMin = 0;
  let next: { activity: SummaryActivity; dueAt: Date } | null = null;

  for (const a of activities) {
    byStatus[a.status] += 1;
    if (isClosed(a.status)) continue;

    open += 1;
    byUrgency[urgency(a.dueAt, now)] += 1;
    pendingSteps += a.steps.filter((s) => !s.done).length;
    remainingMin += remainingMinutes(a.steps);
    if (a.dueAt && a.dueAt >= now && (!next || a.dueAt < next.dueAt)) next = { activity: a, dueAt: a.dueAt };
  }

  return {
    total: activities.length,
    open,
    byStatus,
    byUrgency,
    pendingSteps,
    remainingMin,
    nextDue: next
      ? { id: next.activity.id, title: next.activity.title, dueAt: next.dueAt, urgency: urgency(next.dueAt, now) }
      : null,
  };
}
