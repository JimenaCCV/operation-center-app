import type { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.registerUser(req.body);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { token, user } = await authService.loginUser(req.body);
  res.status(200).json({ token, user });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getUserById(req.user!.id);
  res.status(200).json({ user });
}

export async function listUsers(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await authService.listUsers());
}
