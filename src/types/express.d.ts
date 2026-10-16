import type { Role } from "../models/user.model";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Lo llena el middleware `authenticate` a partir del JWT. */
      user?: { id: string; role: Role };
    }
  }
}

export {};
