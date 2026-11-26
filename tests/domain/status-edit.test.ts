// Feature 4 · Reglas puras de edición y cierre. Cada prueba lleva el ID de evidencia/CASOS-F4.md.
import { describe, expect, it } from "@jest/globals";
import {
  CLOSED_MESSAGE,
  MAX_STEPS,
  checkAddStep,
  checkClose,
  checkEditable,
  statusAfterStepEdit,
} from "../../src/domain/status";

const closedError = { ok: false, message: CLOSED_MESSAGE };

describe("checkEditable", () => {
  it("HP-01: abierta se puede editar", () => {
    for (const s of ["pendiente", "en_curso", "lista"] as const) expect(checkEditable(s)).toEqual({ ok: true });
  });
  it("ER-01: entregada o cancelada no", () => {
    expect(checkEditable("entregada")).toEqual(closedError);
    expect(checkEditable("cancelada")).toEqual(closedError);
  });
});

describe("checkClose", () => {
  it("ED-01: cancelar una abierta siempre se permite, aunque tenga pasos pendientes", () => {
    expect(checkClose("en_curso", "cancelada", [{ done: false }, { done: true }])).toEqual({ ok: true });
  });
  it("ED-02: entregar sin pasos se permite", () => {
    expect(checkClose("pendiente", "entregada", [])).toEqual({ ok: true });
  });
  it("HP-02: entregar con todos los pasos hechos se permite", () => {
    expect(checkClose("lista", "entregada", [{ done: true }, { done: true }])).toEqual({ ok: true });
  });
  it("ER-02: entregar con 1 paso pendiente → dice cuántos faltan", () => {
    expect(checkClose("en_curso", "entregada", [{ done: true }, { done: false }])).toEqual({
      ok: false,
      message: "Faltan 1 paso(s) por completar",
    });
  });
  it("ER-03: entregar con varios pendientes cuenta todos", () => {
    const r = checkClose("pendiente", "entregada", [{ done: false }, { done: false }, { done: false }]);
    expect(r).toEqual({ ok: false, message: "Faltan 3 paso(s) por completar" });
  });
  it("ER-04: una actividad ya cerrada no se vuelve a cerrar", () => {
    expect(checkClose("entregada", "cancelada", [])).toEqual(closedError);
    expect(checkClose("cancelada", "entregada", [])).toEqual(closedError);
  });
});

describe("checkAddStep", () => {
  it("ED-03: permite agregar hasta llegar al máximo (el paso 50 sí)", () => {
    expect(checkAddStep("pendiente", 0)).toEqual({ ok: true });
    expect(checkAddStep("en_curso", MAX_STEPS - 1)).toEqual({ ok: true });
  });
  it("ED-04: el paso 51 se rechaza", () => {
    expect(checkAddStep("en_curso", MAX_STEPS)).toEqual({ ok: false, message: "Una actividad admite máximo 50 pasos" });
  });
  it("ER-05: cerrada se rechaza aunque tenga espacio", () => {
    expect(checkAddStep("entregada", 1)).toEqual(closedError);
  });
});

describe("statusAfterStepEdit", () => {
  it("ED-05: sin pasos vuelve a pendiente", () => {
    expect(statusAfterStepEdit("en_curso", [])).toBe("pendiente");
    expect(statusAfterStepEdit("lista", [])).toBe("pendiente");
  });
  it("ED-06: agregar un paso a una actividad lista la regresa a en_curso", () => {
    expect(statusAfterStepEdit("lista", [{ done: true }, { done: false }])).toBe("en_curso");
  });
  it("HP-03: si los pasos restantes están todos hechos pasa a lista", () => {
    expect(statusAfterStepEdit("en_curso", [{ done: true }])).toBe("lista");
  });
  it("HP-04: con un solo paso pendiente se queda como estaba", () => {
    expect(statusAfterStepEdit("pendiente", [{ done: false }])).toBe("pendiente");
  });
  it("ED-07: nunca cambia una actividad cerrada", () => {
    expect(statusAfterStepEdit("entregada", [])).toBe("entregada");
    expect(statusAfterStepEdit("cancelada", [{ done: false }])).toBe("cancelada");
  });
});
