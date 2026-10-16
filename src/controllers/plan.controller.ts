import type { Request, Response } from "express";
import * as planService from "../services/plan.service";
import type { PlanQuery } from "../validators/schemas";

export async function getPlan(req: Request, res: Response): Promise<void> {
  const { minutes } = res.locals.query as PlanQuery;
  res.status(200).json(await planService.planForUser(req.user!.id, minutes));
}
