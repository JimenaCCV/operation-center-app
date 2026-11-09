import { summarize } from "../domain/summary";
import { Activity } from "../models/activity.model";

/** Resumen de carga del usuario: consulta solo sus actividades y aplica la regla de dominio. */
export async function summaryForUser(ownerId: string, now = new Date()) {
  const docs = await Activity.find({ owner: ownerId }).sort({ dueSort: 1, _id: 1 });
  return summarize(
    docs.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      dueAt: d.dueAt,
      steps: d.steps.map((s) => ({ done: s.done, estimateMin: s.estimateMin })),
    })),
    now,
  );
}
