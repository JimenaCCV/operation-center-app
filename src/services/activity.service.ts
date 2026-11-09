import { isValidObjectId, type FilterQuery } from "mongoose";
import {
  checkAddStep,
  checkClose,
  checkEditable,
  deriveStatus,
  remainingMinutes,
  statusAfterStepEdit,
  type RuleResult,
} from "../domain/status";
import { urgency, urgencyRange } from "../domain/urgency";
import { Activity, type IActivity } from "../models/activity.model";
import { HttpError } from "../utils/httpError";
import type {
  AddStepInput,
  CreateActivityInput,
  ListActivitiesQuery,
  UpdateActivityInput,
  UpdateStepBody,
} from "../validators/schemas";

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

/** Convierte el resultado de una regla de dominio en un 409 si rechaza el cambio. */
function enforce(result: RuleResult): void {
  if (!result.ok) throw new HttpError(409, result.message);
}

function findStep(doc: ActivityDoc, stepId: string) {
  const step = isValidObjectId(stepId) ? doc.steps.id(stepId) : null;
  if (!step) throw new HttpError(404, "Paso no encontrado");
  return step;
}

export async function updateActivity(ownerId: string, id: string, input: UpdateActivityInput) {
  const doc = await findOwned(ownerId, id);
  enforce(checkEditable(doc.status));

  if (input.title !== undefined) doc.title = input.title;
  if (input.course !== undefined) doc.course = input.course;
  if (input.brief !== undefined) doc.brief = input.brief;
  if (input.dueAt !== undefined) doc.dueAt = input.dueAt; // dueSort se recalcula en pre("validate")
  if (input.status !== undefined) {
    enforce(checkClose(doc.status, input.status, doc.steps));
    doc.status = input.status;
  }
  await doc.save();
  return present(doc, new Date());
}

/** Se puede borrar en cualquier estado. Ajena o inexistente → 404. */
export async function deleteActivity(ownerId: string, id: string): Promise<void> {
  const doc = await findOwned(ownerId, id);
  await doc.deleteOne();
}

export async function addStep(ownerId: string, activityId: string, input: AddStepInput) {
  const doc = await findOwned(ownerId, activityId);
  enforce(checkAddStep(doc.status, doc.steps.length));

  doc.steps.push({ text: input.text, ...(input.estimateMin ? { estimateMin: input.estimateMin } : {}) });
  doc.status = statusAfterStepEdit(doc.status, doc.steps);
  await doc.save();
  return present(doc, new Date());
}

/**
 * Marca/desmarca un paso (igual que en el Entregable 1, también en actividades cerradas)
 * y, si viene, cambia su texto o sus minutos (eso solo con la actividad abierta).
 */
export async function updateStep(ownerId: string, activityId: string, stepId: string, input: UpdateStepBody) {
  const doc = await findOwned(ownerId, activityId);
  const step = findStep(doc, stepId);
  if (input.text !== undefined || input.estimateMin !== undefined) enforce(checkEditable(doc.status));

  if (input.text !== undefined) step.text = input.text;
  if (input.estimateMin !== undefined) step.estimateMin = input.estimateMin;
  if (input.done !== undefined) {
    step.done = input.done;
    step.doneAt = input.done ? new Date() : null;
  }
  doc.status = deriveStatus(doc.status, doc.steps);
  await doc.save();
  return present(doc, new Date());
}

export async function deleteStep(ownerId: string, activityId: string, stepId: string) {
  const doc = await findOwned(ownerId, activityId);
  const step = findStep(doc, stepId);
  enforce(checkEditable(doc.status));

  step.deleteOne();
  doc.status = statusAfterStepEdit(doc.status, doc.steps);
  await doc.save();
  return present(doc, new Date());
}
