import { CLOSED_STATUSES } from "../domain/status";
import { planSession } from "../domain/planner";
import { Activity } from "../models/activity.model";

/** Arma el plan de una sesión de `minutes` minutos con los pasos pendientes del usuario. */
export async function planForUser(ownerId: string, minutes: number) {
  const docs = await Activity.find({ owner: ownerId, status: { $nin: [...CLOSED_STATUSES] } }).sort({ dueSort: 1, _id: 1 });

  const plan = planSession(
    docs.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      dueAt: d.dueAt,
      steps: d.steps.map((s) => ({ id: s.id, text: s.text, estimateMin: s.estimateMin, done: s.done })),
    })),
    minutes,
  );
  return { minutes, ...plan };
}
