import type { Request, Response } from "express";
import * as summaryService from "../services/summary.service";

export async function getSummary(req: Request, res: Response): Promise<void> {
  res.status(200).json(await summaryService.summaryForUser(req.user!.id));
}
