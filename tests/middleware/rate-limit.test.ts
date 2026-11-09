import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../src/middleware/error.middleware";
import { createAuthLimiter } from "../../src/middleware/rate-limit.middleware";
import { HttpError } from "../../src/utils/httpError";

/** Mini app sin MongoDB: «login» acepta solo la contraseña "buena"; «register» siempre responde 201. */
function miniApp(skipSuccessfulRequests: boolean) {
  const app = express();
  app.use(express.json());
  const limiter = createAuthLimiter({ windowMs: 15 * 60_000, max: 3, skipSuccessfulRequests });
  app.post("/login", limiter, (req, res, next) => {
    if (req.body.password === "buena") res.status(200).json({ token: "t" });
    else next(new HttpError(401, "Credenciales inválidas"));
  });
  app.post("/register", limiter, (_req, res) => {
    res.status(201).json({ user: {} });
  });
  app.use(errorHandler);
  return app;
}

const login = (app: express.Express, password: string) => request(app).post("/login").send({ password });

describe("createAuthLimiter", () => {
  it("el intento 4 da 429 con Retry-After y el formato de error del proyecto", async () => {
    const app = miniApp(true);
    for (let i = 0; i < 3; i++) expect((await login(app, "mala")).status).toBe(401);

    const res = await login(app, "mala");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: { message: "Demasiados intentos. Intenta de nuevo en 15 minuto(s)." } });
    const retryAfter = Number(res.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(15 * 60);
  });

  it("en login los intentos exitosos no cuentan", async () => {
    const app = miniApp(true);
    for (let i = 0; i < 5; i++) expect((await login(app, "buena")).status).toBe(200);
    expect((await login(app, "mala")).status).toBe(401);
    expect((await login(app, "mala")).status).toBe(401);
    expect((await login(app, "buena")).status).toBe(200);
    expect((await login(app, "mala")).status).toBe(401);
    expect((await login(app, "mala")).status).toBe(429);
  });

  it("una vez bloqueado, ni la contraseña correcta pasa", async () => {
    const app = miniApp(true);
    for (let i = 0; i < 3; i++) await login(app, "mala");
    expect((await login(app, "buena")).status).toBe(429);
  });

  it("sin skipSuccessfulRequests (registro) cuentan todos los intentos", async () => {
    const app = miniApp(false);
    for (let i = 0; i < 3; i++) expect((await request(app).post("/register").send({})).status).toBe(201);
    const res = await request(app).post("/register").send({});
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    expect(res.body.error.message).toMatch(/^Demasiados intentos\./);
  });
});
