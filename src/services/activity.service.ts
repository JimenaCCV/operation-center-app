import { isValidObjectId, type FilterQuery } from "mongoose";
import { deriveStatus, remainingMinutes } from "../domain/status";
import { urgency, urgencyRange } from "../domain/urgency";
import { Activity, type IActivity } from "../models/activity.model";
import { HttpError } from "../utils/httpError";
import type { CreateActivityInput, ListActivitiesQuery } from "../validators/schemas";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type ActivityDoc = InstanceType<typeof Activity>;

/** Actividad lista para responder: sus datos + campos calculados por las reglas de dominio. */
function present(doc: ActivityDoc, now: Date) {
  const steps = doc.steps.map((s) => ({ done: s.done, estimateMin: s.estimateMin }));
  return {
    ...doc.toJSON(),
    urgency: urgency(doc.dueAt, now),
    remainingMin: remainingMinutes(steps),
    progress: { done: steps.filter((s) => s.done).length, total: steps.length },
  };
}

function notFound(): never {
  throw new HttpError(404, "Actividad no encontrada");
}

async function findOwned(ownerId: string, id: string): Promise<ActivityDoc> {
  if (!isValidObjectId(id)) notFound();
  // Se filtra por dueño: la actividad de otra persona se ve igual que una que no existe (404).
  const doc = await Activity.findOne({ _id: id, owner: ownerId });
  if (!doc) notFound();
  return doc;
}

export async function createActivity(ownerId: string, input: CreateActivityInput) {
  const doc = await Activity.create({
    owner: ownerId,
    title: input.title,
    course: input.course ?? null,
    brief: input.brief ?? null,
    dueAt: input.dueAt ?? null,
    steps: input.steps.map((s) => ({ text: s.text, ...(s.estimateMin ? { estimateMin: s.estimateMin } : {}) })),
  });
  return present(doc, new Date());
}

export async function getActivity(ownerId: string, id: string) {
  return present(await findOwned(ownerId, id), new Date());
}

export async function listActivities(ownerId: string, q: ListActivitiesQuery, now = new Date()) {
  const filter: FilterQuery<IActivity> = { owner: ownerId };
  if (q.course) filter.course = new RegExp(`^${escapeRegex(q.course)}$`, "i");
  if (q.status) filter.status = q.status;
  if (q.urgency) {
    const range = urgencyRange(q.urgency, now);
    filter.dueAt = range ?? null;
  }

  const [docs, total] = await Promise.all([
    Activity.find(filter).sort({ dueSort: 1, _id: 1 }).skip(q.offset).limit(q.limit),
    Activity.countDocuments(filter),
  ]);
  return { activities: docs.map((d) => present(d, now)), total, limit: q.limit, offset: q.offset };
}

export async function setStepDone(ownerId: string, activityId: string, stepId: string, done: boolean) {
  const doc = await findOwned(ownerId, activityId);
  const step = isValidObjectId(stepId) ? doc.steps.id(stepId) : null;
  if (!step) throw new HttpError(404, "Paso no encontrado");

  step.done = done;
  step.doneAt = done ? new Date() : null;
  doc.status = deriveStatus(doc.status, doc.steps);
  await doc.save();
  return present(doc, new Date());
}
