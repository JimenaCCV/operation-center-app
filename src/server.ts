import { createApp } from "./app";
import { connectDb, disconnectDb } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDb(env.MONGODB_URI);
  const server = createApp().listen(env.PORT, () => {
    console.log(`Centro de Operaciones AI escuchando en http://localhost:${env.PORT}/api (health: /api/health)`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} recibido: cerrando...`);
    server.close(() => {
      disconnectDb().finally(() => process.exit(0));
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err instanceof Error ? err.message : err);
  process.exit(1);
});
