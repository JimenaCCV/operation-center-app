import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { api } from "./routes";

/** Crea la app de Express sin arrancar el servidor (así las pruebas la usan con supertest). */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
