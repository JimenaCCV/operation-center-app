import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app, bearer, registerAndLogin, setupDb, teardownDb } from "./helpers";

beforeAll(setupDb);
afterAll(teardownDb);

const inHours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();

async function createActivity(token: string, body: Record<string, unknown>) {
  const res = await request(app).post("/api/activities").set(bearer(token)).send(body);
  return res;
}

describe("POST /api/activities", () => {
  it("crea la actividad con sus pasos (201) y campos calculados", async () => {
    const { token } = await registerAndLogin();
    const res = await createActivity(token, {
      title: "Entregable 1",
      course: "Tecnologías en el servidor",
      dueAt: inHours(10),
      steps: [{ text: "Definir features", estimateMin: 30 }, { text: "Escribir README" }],
    });
    expect(res.status).toBe(201);
    const a = res.body.activity;
    expect(a).toMatchObject({ title: "Entregable 1", status: "pendiente", urgency: "critica", remainingMin: 45 });
    expect(a.progress).toEqual({ done: 0, total: 2 });
    expect(a.steps).toHaveLength(2);
    expect(a.steps[1]).toMatchObject({ text: "Escribir README", estimateMin: 15, done: false });
    expect(a.steps[0].id).toBeTypeOf("string");
    expect(a).not.toHaveProperty("dueSort");
  });

  it("sin token → 401", async () => {
    expect((await request(app).post("/api/activities").send({ title: "x" })).status).toBe(401);
  });

  it("título vacío, fecha inválida o paso sin texto → 400", async () => {
    const { token } = await registerAndLogin();
    expect((await createActivity(token, { title: "" })).status).toBe(400);
    expect((await createActivity(token, { title: "A", dueAt: "no-es-fecha" })).status).toBe(400);
    expect((await createActivity(token, { title: "A", steps: [{ text: "" }] })).status).toBe(400);
  });

  it("el dueño siempre es quien tiene el token, aunque mande otro owner en el body", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const res = await createActivity(a.token, { title: "Mía", owner: b.userId });
    expect(res.status).toBe(201);
    expect(res.body.activity.owner).toBe(a.userId);
  });
});

describe("GET /api/activities/:id", () => {
  it("devuelve la actividad (200)", async () => {
    const { token } = await registerAndLogin();
    const { body } = await createActivity(token, { title: "Leer" });
    const res = await request(app).get(`/api/activities/${body.activity.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.activity.title).toBe("Leer");
  });

  it("id inexistente o mal formado → 404", async () => {
    const { token } = await registerAndLogin();
    expect((await request(app).get("/api/activities/64b7f0f0f0f0f0f0f0f0f0f0").set(bearer(token))).status).toBe(404);
    expect((await request(app).get("/api/activities/no-es-un-id").set(bearer(token))).status).toBe(404);
  });

  it("la actividad de otra persona → 404 (no se revela que existe)", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const { body } = await createActivity(a.token, { title: "Privada" });
    const res = await request(app).get(`/api/activities/${body.activity.id}`).set(bearer(b.token));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/activities/:id/steps/:stepId", () => {
  it("marcar pasos actualiza el progreso y el estado (pendiente → en_curso → lista)", async () => {
    const { token } = await registerAndLogin();
    const { body } = await createActivity(token, {
      title: "Con pasos",
      steps: [{ text: "Uno", estimateMin: 10 }, { text: "Dos", estimateMin: 20 }],
    });
    const { id, steps } = body.activity;

    const first = await request(app).patch(`/api/activities/${id}/steps/${steps[0].id}`).set(bearer(token)).send({ done: true });
    expect(first.status).toBe(200);
    expect(first.body.activity).toMatchObject({ status: "en_curso", remainingMin: 20, progress: { done: 1, total: 2 } });
    expect(first.body.activity.steps[0].doneAt).toBeTypeOf("string");

    const second = await request(app).patch(`/api/activities/${id}/steps/${steps[1].id}`).set(bearer(token)).send({ done: true });
    expect(second.body.activity).toMatchObject({ status: "lista", remainingMin: 0 });

    const undo = await request(app).patch(`/api/activities/${id}/steps/${steps[1].id}`).set(bearer(token)).send({ done: false });
    expect(undo.body.activity.status).toBe("en_curso");
    expect(undo.body.activity.steps[1].doneAt).toBeNull();
  });

  it("done que no es booleano → 400", async () => {
    const { token } = await registerAndLogin();
    const { body } = await createActivity(token, { title: "X", steps: [{ text: "Uno" }] });
    const res = await request(app)
      .patch(`/api/activities/${body.activity.id}/steps/${body.activity.steps[0].id}`)
      .set(bearer(token))
      .send({ done: "si" });
    expect(res.status).toBe(400);
  });

  it("paso inexistente → 404; actividad ajena → 404", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const { body } = await createActivity(a.token, { title: "X", steps: [{ text: "Uno" }] });
    const { id, steps } = body.activity;
    expect((await request(app).patch(`/api/activities/${id}/steps/64b7f0f0f0f0f0f0f0f0f0f0`).set(bearer(a.token)).send({ done: true })).status).toBe(404);
    expect((await request(app).patch(`/api/activities/${id}/steps/${steps[0].id}`).set(bearer(b.token)).send({ done: true })).status).toBe(404);
  });
});
