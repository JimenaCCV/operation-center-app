import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app, bearer, registerAndLogin, setupDb, teardownDb } from "./helpers";

beforeAll(setupDb);
afterAll(teardownDb);

const inHours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();
const create = (token: string, body: Record<string, unknown>) =>
  request(app).post("/api/activities").set(bearer(token)).send(body).expect(201).then((r) => r.body.activity);

describe("GET /api/activities (listar con filtros)", () => {
  it("lista solo las actividades del usuario, ordenadas por fecha y con «sin fecha» al final", async () => {
    const me = await registerAndLogin();
    const other = await registerAndLogin();
    await create(me.token, { title: "Sin fecha" });
    await create(me.token, { title: "Lejana", dueAt: inHours(200) });
    await create(me.token, { title: "Cercana", dueAt: inHours(5) });
    await create(other.token, { title: "De otra persona", dueAt: inHours(1) });

    const res = await request(app).get("/api/activities").set(bearer(me.token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.activities.map((a: { title: string }) => a.title)).toEqual(["Cercana", "Lejana", "Sin fecha"]);
  });

  it("filtra por materia (sin importar mayúsculas), estado y urgencia", async () => {
    const { token } = await registerAndLogin();
    await create(token, { title: "A", course: "Bioética", dueAt: inHours(10) });
    await create(token, { title: "B", course: "Bioética", dueAt: inHours(100) });
    await create(token, { title: "C", course: "Lenguajes Formales", dueAt: inHours(-5) });

    const byCourse = await request(app).get("/api/activities?course=bioética").set(bearer(token));
    expect(byCourse.body.activities.map((a: { title: string }) => a.title)).toEqual(["A", "B"]);

    const byUrgency = await request(app).get("/api/activities?urgency=vencida").set(bearer(token));
    expect(byUrgency.body.activities.map((a: { title: string }) => a.title)).toEqual(["C"]);

    const combined = await request(app).get("/api/activities?course=Bioética&urgency=critica").set(bearer(token));
    expect(combined.body.activities.map((a: { title: string }) => a.title)).toEqual(["A"]);

    const byStatus = await request(app).get("/api/activities?status=lista").set(bearer(token));
    expect(byStatus.body.total).toBe(0);
  });

  it("pagina con limit y offset, y total refleja el filtro completo", async () => {
    const { token } = await registerAndLogin();
    for (let i = 1; i <= 5; i++) await create(token, { title: `T${i}`, dueAt: inHours(i) });
    const res = await request(app).get("/api/activities?limit=2&offset=2").set(bearer(token));
    expect(res.body).toMatchObject({ total: 5, limit: 2, offset: 2 });
    expect(res.body.activities.map((a: { title: string }) => a.title)).toEqual(["T3", "T4"]);
  });

  it("parámetros inválidos → 400; sin token → 401", async () => {
    const { token } = await registerAndLogin();
    expect((await request(app).get("/api/activities?status=inventado").set(bearer(token))).status).toBe(400);
    expect((await request(app).get("/api/activities?limit=0").set(bearer(token))).status).toBe(400);
    expect((await request(app).get("/api/activities?limit=1000").set(bearer(token))).status).toBe(400);
    expect((await request(app).get("/api/activities")).status).toBe(401);
  });
});

describe("GET /api/plan (plan de sesión)", () => {
  it("llena los minutos disponibles con los pasos de las entregas más cercanas", async () => {
    const { token } = await registerAndLogin();
    await create(token, { title: "Urgente", dueAt: inHours(5), steps: [{ text: "u1", estimateMin: 10 }, { text: "u2", estimateMin: 30 }] });
    await create(token, { title: "Después", dueAt: inHours(50), steps: [{ text: "d1", estimateMin: 15 }] });

    const res = await request(app).get("/api/plan?minutes=25").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.minutes).toBe(25);
    expect(res.body.steps.map((s: { text: string }) => s.text)).toEqual(["u1", "d1"]);
    expect(res.body).toMatchObject({ totalMin: 25, remaining: 1 });
    expect(res.body.steps[1]).toMatchObject({ activityTitle: "Después", startsAtMin: 10 });
  });

  it("no incluye actividades entregadas ni pasos hechos", async () => {
    const { token } = await registerAndLogin();
    const a = await create(token, { title: "A", dueAt: inHours(5), steps: [{ text: "hecho" }, { text: "pendiente" }] });
    await request(app).patch(`/api/activities/${a.id}/steps/${a.steps[0].id}`).set(bearer(token)).send({ done: true }).expect(200);

    const res = await request(app).get("/api/plan?minutes=60").set(bearer(token));
    expect(res.body.steps.map((s: { text: string }) => s.text)).toEqual(["pendiente"]);
  });

  it("sin minutos usa 30 por defecto; minutos inválidos → 400; sin token → 401", async () => {
    const { token } = await registerAndLogin();
    expect((await request(app).get("/api/plan").set(bearer(token))).body.minutes).toBe(30);
    expect((await request(app).get("/api/plan?minutes=abc").set(bearer(token))).status).toBe(400);
    expect((await request(app).get("/api/plan?minutes=0").set(bearer(token))).status).toBe(400);
    expect((await request(app).get("/api/plan")).status).toBe(401);
  });

  it("sin actividades devuelve un plan vacío (200)", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app).get("/api/plan?minutes=30").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ minutes: 30, steps: [], totalMin: 0, remaining: 0 });
  });
});
