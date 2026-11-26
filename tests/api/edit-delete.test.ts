// Feature 4 · Edición, cierre y borrado (API). Cada prueba lleva el ID de evidencia/CASOS-F4.md.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Activity } from "../../src/models/activity.model";
import { app, bearer, registerAndLogin, setupDb, teardownDb } from "./helpers";

beforeAll(setupDb);
afterAll(teardownDb);

const inHours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();
const MISSING_ID = "64b7f0f0f0f0f0f0f0f0f0f0";

async function createActivity(token: string, body: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/activities")
    .set(bearer(token))
    .send({ title: "Proyecto", steps: [{ text: "Uno", estimateMin: 10 }, { text: "Dos", estimateMin: 20 }], ...body })
    .expect(201);
  return res.body.activity;
}

const patch = (token: string, id: string, body: unknown) =>
  request(app).patch(`/api/activities/${id}`).set(bearer(token)).send(body as object);
const patchStep = (token: string, id: string, stepId: string, body: unknown) =>
  request(app).patch(`/api/activities/${id}/steps/${stepId}`).set(bearer(token)).send(body as object);
const addStep = (token: string, id: string, body: unknown) =>
  request(app).post(`/api/activities/${id}/steps`).set(bearer(token)).send(body as object);
const deleteStep = (token: string, id: string, stepId: string) =>
  request(app).delete(`/api/activities/${id}/steps/${stepId}`).set(bearer(token));

describe("PATCH /api/activities/:id", () => {
  it("HP-05: cambia título, materia, descripción y fecha (200) y recalcula la urgencia", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { dueAt: inHours(200) });
    const res = await patch(token, a.id, { title: "Nuevo título", course: "Servidor", brief: "Detalle", dueAt: inHours(5) });
    expect(res.status).toBe(200);
    expect(res.body.activity).toMatchObject({ title: "Nuevo título", course: "Servidor", brief: "Detalle", urgency: "critica" });
  });

  it("ED-08: null quita la fecha, la materia y la descripción (no se vuelve 1970)", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { dueAt: inHours(10), course: "X", brief: "Y" });
    const res = await patch(token, a.id, { dueAt: null, course: null, brief: null });
    expect(res.status).toBe(200);
    expect(res.body.activity).toMatchObject({ dueAt: null, course: null, brief: null, urgency: "sin_fecha" });
  });

  it("ED-09: al cambiar la fecha se actualiza el orden (dueSort)", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { dueAt: inHours(100) });
    const b = await createActivity(token, { dueAt: inHours(50) });
    await patch(token, a.id, { dueAt: inHours(1) }).expect(200);
    const list = await request(app).get("/api/activities").set(bearer(token));
    expect(list.body.activities.map((x: { id: string }) => x.id)).toEqual([a.id, b.id]);
    await patch(token, a.id, { dueAt: null }).expect(200);
    const list2 = await request(app).get("/api/activities").set(bearer(token));
    expect(list2.body.activities.map((x: { id: string }) => x.id)).toEqual([b.id, a.id]);
  });

  it("ER-06: body vacío, solo campos desconocidos o tipos malos → 400", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    for (const body of [{}, { owner: "otro", foo: 1 }, { title: "" }, { title: 5 }, { dueAt: "no-es-fecha" }, { status: "lista" }]) {
      const res = await patch(token, a.id, body);
      // Jest no acepta mensaje en expect: se compara junto con el body para saber cuál falló.
      expect({ body, status: res.status }).toEqual({ body, status: 400 });
      expect(res.body.error.message).toBe("Datos inválidos");
    }
  });

  it("ER-07: dueAt booleano o arreglo → 400 (antes se guardaba como 1970)", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { dueAt: inHours(48) });
    for (const dueAt of [true, false, ["2026-12-01"]]) {
      const res = await patch(token, a.id, { dueAt });
      expect({ dueAt, status: res.status }).toEqual({ dueAt, status: 400 });
      expect(res.body.error.message).toBe("Datos inválidos");
    }
    const after = await request(app).get(`/api/activities/${a.id}`).set(bearer(token));
    expect(after.body.activity.dueAt).toBe(a.dueAt);
  });

  it("ER-08: sin token → 401", async () => {
    expect((await request(app).patch(`/api/activities/${MISSING_ID}`).send({ title: "x" })).status).toBe(401);
  });

  it("ER-09: ajena o inexistente → 404", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const act = await createActivity(a.token);
    expect((await patch(b.token, act.id, { title: "robada" })).status).toBe(404);
    expect((await patch(a.token, MISSING_ID, { title: "x" })).status).toBe(404);
    expect((await patch(a.token, "no-es-id", { title: "x" })).status).toBe(404);
  });

  it("ER-10: entregar con pasos pendientes → 409 con cuántos faltan", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    await patchStep(token, a.id, a.steps[0].id, { done: true }).expect(200);
    const res = await patch(token, a.id, { status: "entregada" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { message: "Faltan 1 paso(s) por completar" } });
  });

  it("HP-06: entregar con todos los pasos hechos (200) y luego editarla → 409 cerrada", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    for (const s of a.steps) await patchStep(token, a.id, s.id, { done: true }).expect(200);
    const res = await patch(token, a.id, { status: "entregada" });
    expect(res.status).toBe(200);
    expect(res.body.activity.status).toBe("entregada");

    const edit = await patch(token, a.id, { title: "Otro" });
    expect(edit.status).toBe(409);
    expect(edit.body.error.message).toBe("La actividad está cerrada y no se puede modificar");
    expect((await patch(token, a.id, { status: "cancelada" })).status).toBe(409);
  });

  it("ED-10: cancelar se permite aunque tenga pasos pendientes", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const res = await patch(token, a.id, { status: "cancelada" });
    expect(res.status).toBe(200);
    expect(res.body.activity.status).toBe("cancelada");
  });

  it("ED-11: entregar una actividad sin pasos → 200", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { steps: [] });
    const res = await patch(token, a.id, { status: "entregada" });
    expect(res.status).toBe(200);
    expect(res.body.activity).toMatchObject({ status: "entregada", progress: { done: 0, total: 0 } });
  });

  it("ED-12: título + entregar con pasos pendientes → 409 y no se guarda ningún cambio", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const res = await patch(token, a.id, { title: "Cambio que no debe quedar", status: "entregada" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Faltan 2 paso(s) por completar");
    const after = await request(app).get(`/api/activities/${a.id}`).set(bearer(token));
    expect(after.body.activity).toMatchObject({ title: "Proyecto", status: "pendiente" });
  });
});

describe("DELETE /api/activities/:id", () => {
  it("HP-07: borra (204 sin cuerpo) y después el GET da 404", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const res = await request(app).delete(`/api/activities/${a.id}`).set(bearer(token));
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect((await request(app).get(`/api/activities/${a.id}`).set(bearer(token))).status).toBe(404);
    expect(await Activity.countDocuments({ _id: a.id })).toBe(0);
  });

  it("ED-13: se puede borrar una actividad cerrada", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    await patch(token, a.id, { status: "cancelada" }).expect(200);
    expect((await request(app).delete(`/api/activities/${a.id}`).set(bearer(token))).status).toBe(204);
  });

  it("ER-11: ajena o inexistente → 404 (y la ajena sigue existiendo); sin token → 401", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const act = await createActivity(a.token);
    expect((await request(app).delete(`/api/activities/${act.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await request(app).delete(`/api/activities/${MISSING_ID}`).set(bearer(a.token))).status).toBe(404);
    expect((await request(app).delete(`/api/activities/${act.id}`)).status).toBe(401);
    expect((await request(app).get(`/api/activities/${act.id}`).set(bearer(a.token))).status).toBe(200);
  });
});

describe("POST /api/activities/:id/steps", () => {
  it("HP-08: agrega un paso (201); a una actividad lista la regresa a en_curso", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { steps: [{ text: "Único", estimateMin: 10 }] });
    const done = await patchStep(token, a.id, a.steps[0].id, { done: true });
    expect(done.body.activity.status).toBe("lista");

    const res = await addStep(token, a.id, { text: "Revisar", estimateMin: 25 });
    expect(res.status).toBe(201);
    expect(res.body.activity).toMatchObject({ status: "en_curso", remainingMin: 25, progress: { done: 1, total: 2 } });
    expect(res.body.activity.steps[1]).toMatchObject({ text: "Revisar", estimateMin: 25, done: false });
  });

  it("ED-14: sin estimateMin usa 15 minutos", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { steps: [] });
    const res = await addStep(token, a.id, { text: "Leer" });
    expect(res.status).toBe(201);
    expect(res.body.activity.steps[0].estimateMin).toBe(15);
  });

  it("ER-12: texto vacío o minutos fuera de rango → 400", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    expect((await addStep(token, a.id, {})).status).toBe(400);
    expect((await addStep(token, a.id, { text: "" })).status).toBe(400);
    expect((await addStep(token, a.id, { text: "x", estimateMin: 0 })).status).toBe(400);
    expect((await addStep(token, a.id, { text: "x", estimateMin: 481 })).status).toBe(400);
  });

  it("ER-13: cerrada → 409; ajena → 404; sin token → 401", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const act = await createActivity(a.token);
    expect((await addStep(b.token, act.id, { text: "x" })).status).toBe(404);
    expect((await request(app).post(`/api/activities/${act.id}/steps`).send({ text: "x" })).status).toBe(401);
    await patch(a.token, act.id, { status: "cancelada" }).expect(200);
    const res = await addStep(a.token, act.id, { text: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("La actividad está cerrada y no se puede modificar");
  });

  it("ER-14: el paso 51 → 409", async () => {
    const { token } = await registerAndLogin();
    const steps = Array.from({ length: 50 }, (_, i) => ({ text: `Paso ${i + 1}` }));
    const a = await createActivity(token, { steps });
    const res = await addStep(token, a.id, { text: "Uno más" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Una actividad admite máximo 50 pasos");
  });

  it("ED-15: con 49 pasos, el paso 50 sí se agrega (201)", async () => {
    const { token } = await registerAndLogin();
    const steps = Array.from({ length: 49 }, (_, i) => ({ text: `Paso ${i + 1}` }));
    const a = await createActivity(token, { steps });
    const res = await addStep(token, a.id, { text: "El número 50" });
    expect(res.status).toBe(201);
    expect(res.body.activity.progress).toEqual({ done: 0, total: 50 });
  });

  it("ED-16: límites al agregar: texto de 300 y minutos 1 y 480 sí; texto de 301 no", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { steps: [] });
    expect((await addStep(token, a.id, { text: "a".repeat(300) })).status).toBe(201);
    expect((await addStep(token, a.id, { text: "Corto", estimateMin: 1 })).status).toBe(201);
    expect((await addStep(token, a.id, { text: "Largo", estimateMin: 480 })).status).toBe(201);
    expect((await addStep(token, a.id, { text: "a".repeat(301) })).status).toBe(400);
  });

  it("ER-15: texto de solo espacios o minutos con decimales → 400", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    expect((await addStep(token, a.id, { text: "   " })).status).toBe(400);
    expect((await addStep(token, a.id, { text: "x", estimateMin: 1.5 })).status).toBe(400);
    expect((await addStep(token, a.id, { text: "x", estimateMin: "10" })).status).toBe(400);
  });
});

describe("PATCH /api/activities/:id/steps/:stepId (ampliado)", () => {
  it("HP-09: edita texto y minutos (200) sin tocar done", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const res = await patchStep(token, a.id, a.steps[1].id, { text: "Dos (corregido)", estimateMin: 45 });
    expect(res.status).toBe(200);
    expect(res.body.activity.steps[1]).toMatchObject({ text: "Dos (corregido)", estimateMin: 45, done: false });
    expect(res.body.activity.remainingMin).toBe(55);
  });

  it("ER-16: sigue aceptando { done: true } y rechazando { done: 'si' } o body vacío", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    expect((await patchStep(token, a.id, a.steps[0].id, { done: true })).status).toBe(200);
    expect((await patchStep(token, a.id, a.steps[0].id, { done: "si" })).status).toBe(400);
    expect((await patchStep(token, a.id, a.steps[0].id, {})).status).toBe(400);
    expect((await patchStep(token, a.id, a.steps[0].id, { text: "" })).status).toBe(400);
  });

  it("ED-17: con la actividad cerrada: editar texto → 409, pero marcar/desmarcar sigue funcionando", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    await patch(token, a.id, { status: "cancelada" }).expect(200);
    expect((await patchStep(token, a.id, a.steps[0].id, { text: "x" })).status).toBe(409);
    expect((await patchStep(token, a.id, a.steps[0].id, { estimateMin: 5 })).status).toBe(409);
    const res = await patchStep(token, a.id, a.steps[0].id, { done: true });
    expect(res.status).toBe(200);
    expect(res.body.activity.status).toBe("cancelada");
  });

  it("ER-17: paso inexistente o de otra actividad → 404 «Paso no encontrado»", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const b = await createActivity(token);
    for (const stepId of [MISSING_ID, b.steps[0].id]) {
      const res = await patchStep(token, a.id, stepId, { done: true });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: { message: "Paso no encontrado" } });
    }
  });

  it("ED-18: límites al editar un paso: texto 300 y minutos 1/480 sí; 301, 0 y 481 no", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const stepId = a.steps[0].id;
    expect((await patchStep(token, a.id, stepId, { text: "b".repeat(300) })).status).toBe(200);
    expect((await patchStep(token, a.id, stepId, { estimateMin: 1 })).status).toBe(200);
    expect((await patchStep(token, a.id, stepId, { estimateMin: 480 })).status).toBe(200);
    expect((await patchStep(token, a.id, stepId, { text: "b".repeat(301) })).status).toBe(400);
    expect((await patchStep(token, a.id, stepId, { estimateMin: 0 })).status).toBe(400);
    expect((await patchStep(token, a.id, stepId, { estimateMin: 481 })).status).toBe(400);
  });
});

describe("DELETE /api/activities/:id/steps/:stepId", () => {
  it("HP-10: quita el paso (200) y recalcula: si los restantes están hechos pasa a lista", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    await patchStep(token, a.id, a.steps[0].id, { done: true }).expect(200);
    const res = await deleteStep(token, a.id, a.steps[1].id);
    expect(res.status).toBe(200);
    expect(res.body.activity).toMatchObject({ status: "lista", progress: { done: 1, total: 1 } });
  });

  it("ED-19: si ya no quedan pasos vuelve a pendiente", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token, { steps: [{ text: "Único" }] });
    await patchStep(token, a.id, a.steps[0].id, { done: true }).expect(200);
    const res = await deleteStep(token, a.id, a.steps[0].id);
    expect(res.status).toBe(200);
    expect(res.body.activity).toMatchObject({ status: "pendiente", steps: [], remainingMin: 0 });
  });

  it("ER-18: paso inexistente → 404; ajena → 404; cerrada → 409; sin token → 401", async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    const act = await createActivity(a.token);
    expect((await deleteStep(a.token, act.id, MISSING_ID)).status).toBe(404);
    expect((await deleteStep(b.token, act.id, act.steps[0].id)).status).toBe(404);
    expect((await request(app).delete(`/api/activities/${act.id}/steps/${act.steps[0].id}`)).status).toBe(401);
    await patch(a.token, act.id, { status: "cancelada" }).expect(200);
    expect((await deleteStep(a.token, act.id, act.steps[0].id)).status).toBe(409);
  });
});

describe("ids mal formados en las rutas de la feature", () => {
  it("ER-19: :id o :stepId que no es ObjectId → 404 en JSON (nunca 500)", async () => {
    const { token } = await registerAndLogin();
    const a = await createActivity(token);
    const responses = [
      await patch(token, "no-es-id", { title: "x" }),
      await request(app).delete("/api/activities/no-es-id").set(bearer(token)),
      await addStep(token, "no-es-id", { text: "x" }),
      await patchStep(token, a.id, "no-es-id", { done: true }),
      await deleteStep(token, a.id, "no-es-id"),
      await patchStep(token, "no-es-id", a.steps[0].id, { done: true }),
    ];
    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(typeof res.body.error.message).toBe("string");
    }
  });
});
