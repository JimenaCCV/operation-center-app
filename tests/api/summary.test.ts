import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app, bearer, registerAndLogin, setupDb, teardownDb } from "./helpers";

beforeAll(setupDb);
afterAll(teardownDb);

const inHours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();
const create = (token: string, body: Record<string, unknown>) =>
  request(app).post("/api/activities").set(bearer(token)).send(body).expect(201).then((r) => r.body.activity);

describe("GET /api/summary", () => {
  it("resume datos creados con los otros endpoints (200)", async () => {
    const { token } = await registerAndLogin();
    const critical = await create(token, {
      title: "Entregable",
      dueAt: inHours(10),
      steps: [{ text: "A", estimateMin: 30 }, { text: "B", estimateMin: 20 }],
    });
    await create(token, { title: "Lectura", dueAt: inHours(48), steps: [{ text: "Leer", estimateMin: 40 }] });
    await create(token, { title: "Sin fecha", steps: [{ text: "Algo", estimateMin: 15 }] });
    await create(token, { title: "Vencida", dueAt: inHours(-3), steps: [{ text: "Tarde", estimateMin: 10 }] });
    const cancelled = await create(token, { title: "Cancelada", dueAt: inHours(1), steps: [{ text: "x", estimateMin: 99 }] });

    // Un paso hecho y una actividad cancelada, con los endpoints de la feature 4.
    await request(app).patch(`/api/activities/${critical.id}/steps/${critical.steps[0].id}`).set(bearer(token)).send({ done: true }).expect(200);
    await request(app).patch(`/api/activities/${cancelled.id}`).set(bearer(token)).send({ status: "cancelada" }).expect(200);

    const res = await request(app).get("/api/summary").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 5,
      open: 4,
      byStatus: { pendiente: 3, en_curso: 1, lista: 0, entregada: 0, cancelada: 1 },
      byUrgency: { vencida: 1, critica: 1, pronto: 1, holgada: 0, sin_fecha: 1 },
      pendingSteps: 4,
      remainingMin: 85,
      nextDue: { id: critical.id, title: "Entregable", dueAt: critical.dueAt, urgency: "critica" },
    });
  });

  it("usuario sin actividades → 200 con todo en cero", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app).get("/api/summary").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, open: 0, pendingSteps: 0, remainingMin: 0, nextDue: null });
  });

  it("no mezcla actividades de otro usuario", async () => {
    const me = await registerAndLogin();
    const other = await registerAndLogin();
    await create(other.token, { title: "Ajena", dueAt: inHours(2), steps: [{ text: "x", estimateMin: 60 }] });
    await create(me.token, { title: "Mía", steps: [{ text: "y", estimateMin: 15 }] });

    const res = await request(app).get("/api/summary").set(bearer(me.token));
    expect(res.body).toMatchObject({ total: 1, open: 1, pendingSteps: 1, remainingMin: 15, nextDue: null });
  });

  it("sin token → 401", async () => {
    expect((await request(app).get("/api/summary")).status).toBe(401);
  });
});
