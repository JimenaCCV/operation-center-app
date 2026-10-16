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

export async function setStep(req: Request, res: Response): Promise<void> {
  const activity = await activityService.setStepDone(
    req.user!.id,
    String(req.params.id),
    String(req.params.stepId),
    req.body.done,
  );
  res.status(200).json({ activity });
}
