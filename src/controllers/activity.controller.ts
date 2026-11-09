import type { Request, Response } from "express";
import * as activityService from "../services/activity.service";
import type { ListActivitiesQuery } from "../validators/schemas";

export async function create(req: Request, res: Response): Promise<void> {
  const activity = await activityService.createActivity(req.user!.id, req.body);
  res.status(201).json({ activity });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListActivitiesQuery;
  res.status(200).json(await activityService.listActivities(req.user!.id, query));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const activity = await activityService.getActivity(req.user!.id, String(req.params.id));
  res.status(200).json({ activity });
}

export async function update(req: Request, res: Response): Promise<void> {
  const activity = await activityService.updateActivity(req.user!.id, String(req.params.id), req.body);
  res.status(200).json({ activity });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await activityService.deleteActivity(req.user!.id, String(req.params.id));
  res.status(204).end();
}

export async function addStep(req: Request, res: Response): Promise<void> {
  const activity = await activityService.addStep(req.user!.id, String(req.params.id), req.body);
  res.status(201).json({ activity });
}

export async function updateStep(req: Request, res: Response): Promise<void> {
  const activity = await activityService.updateStep(
    req.user!.id,
    String(req.params.id),
    String(req.params.stepId),
    req.body,
  );
  res.status(200).json({ activity });
}

export async function removeStep(req: Request, res: Response): Promise<void> {
  const activity = await activityService.deleteStep(req.user!.id, String(req.params.id), String(req.params.stepId));
  res.status(200).json({ activity });
}
