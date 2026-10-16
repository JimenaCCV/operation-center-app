import { describe, expect, it } from "vitest";
import { planSession, type PlannableActivity } from "../../src/domain/planner";

const step = (id: string, estimateMin: number, done = false) => ({ id, text: `paso ${id}`, estimateMin, done });
const act = (id: string, dueInHours: number | null, steps: ReturnType<typeof step>[], status: PlannableActivity["status"] = "pendiente"): PlannableActivity => ({
  id,
  title: `Actividad ${id}`,
  status,
  dueAt: dueInHours === null ? null : new Date(Date.UTC(2026, 9, 15) + dueInHours * 36e5),
  steps,
});

describe("planSession", () => {
  it("ordena por fecha de entrega más cercana", () => {
    const plan = planSession([act("tarde", 100, [step("a", 10)]), act("pronto", 5, [step("b", 10)])], 60);
    expect(plan.steps.map((s) => s.activityId)).toEqual(["pronto", "tarde"]);
  });

  it("las actividades sin fecha van al final", () => {
    const plan = planSession([act("sinfecha", null, [step("a", 10)]), act("conFecha", 50, [step("b", 10)])], 60);
    expect(plan.steps.map((s) => s.activityId)).toEqual(["conFecha", "sinfecha"]);
  });

  it("llena el tiempo con pasos de otras actividades cuando el siguiente no cabe", () => {
    // 25 min: el paso de 30 de la primera no cabe, pero sí el de 15 de la segunda.
    const plan = planSession([act("a", 1, [step("a1", 10), step("a2", 30)]), act("b", 2, [step("b1", 15)])], 25);
    expect(plan.steps.map((s) => s.stepId)).toEqual(["a1", "b1"]);
    expect(plan.totalMin).toBe(25);
    expect(plan.remaining).toBe(1);
  });

  it("no se salta pasos dentro de la misma actividad", () => {
    const plan = planSession([act("a", 1, [step("a1", 40), step("a2", 5)])], 20);
    // a1 no cabe pero es el primero: se incluye (siempre al menos un paso) y a2 ya no cabe.
    expect(plan.steps.map((s) => s.stepId)).toEqual(["a1"]);
  });

  it("siempre incluye al menos un paso aunque exceda el tiempo", () => {
    const plan = planSession([act("a", 1, [step("a1", 90)])], 10);
    expect(plan.steps).toHaveLength(1);
    expect(plan.totalMin).toBe(90);
  });

  it("ignora pasos hechos y actividades cerradas", () => {
    const plan = planSession(
      [act("cerrada", 1, [step("c1", 10)], "entregada"), act("a", 2, [step("a1", 10, true), step("a2", 10)])],
      60,
    );
    expect(plan.steps.map((s) => s.stepId)).toEqual(["a2"]);
  });

  it("con nada pendiente devuelve un plan vacío", () => {
    expect(planSession([], 30)).toEqual({ steps: [], totalMin: 0, remaining: 0 });
  });

  it("calcula en qué minuto empieza cada paso", () => {
    const plan = planSession([act("a", 1, [step("a1", 10), step("a2", 20)])], 60);
    expect(plan.steps.map((s) => s.startsAtMin)).toEqual([0, 10]);
  });
});
