import { describe, expect, it } from "vitest";
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
  it("abierta se puede editar", () => {
    for (const s of ["pendiente", "en_curso", "lista"] as const) expect(checkEditable(s)).toEqual({ ok: true });
  });
  it("entregada o cancelada no", () => {
    expect(checkEditable("entregada")).toEqual(closedError);
    expect(checkEditable("cancelada")).toEqual(closedError);
  });
});

describe("checkClose", () => {
  it("cancelar una abierta siempre se permite, aunque tenga pasos pendientes", () => {
    expect(checkClose("en_curso", "cancelada", [{ done: false }, { done: true }])).toEqual({ ok: true });
  });
  it("entregar sin pasos se permite", () => {
    expect(checkClose("pendiente", "entregada", [])).toEqual({ ok: true });
  });
  it("entregar con todos los pasos hechos se permite", () => {
    expect(checkClose("lista", "entregada", [{ done: true }, { done: true }])).toEqual({ ok: true });
  });
  it("entregar con 1 paso pendiente → dice cuántos faltan", () => {
    expect(checkClose("en_curso", "entregada", [{ done: true }, { done: false }])).toEqual({
      ok: false,
      message: "Faltan 1 paso(s) por completar",
    });
  });
  it("entregar con varios pendientes cuenta todos", () => {
    const r = checkClose("pendiente", "entregada", [{ done: false }, { done: false }, { done: false }]);
    expect(r).toEqual({ ok: false, message: "Faltan 3 paso(s) por completar" });
  });
  it("una actividad ya cerrada no se vuelve a cerrar", () => {
    expect(checkClose("entregada", "cancelada", [])).toEqual(closedError);
    expect(checkClose("cancelada", "entregada", [])).toEqual(closedError);
  });
});

describe("checkAddStep", () => {
  it("permite agregar hasta llegar al máximo", () => {
    expect(checkAddStep("pendiente", 0)).toEqual({ ok: true });
    expect(checkAddStep("en_curso", MAX_STEPS - 1)).toEqual({ ok: true });
  });
  it("el paso 51 se rechaza", () => {
    expect(checkAddStep("en_curso", MAX_STEPS)).toEqual({ ok: false, message: "Una actividad admite máximo 50 pasos" });
  });
  it("cerrada se rechaza aunque tenga espacio", () => {
    expect(checkAddStep("entregada", 1)).toEqual(closedError);
  });
});

describe("statusAfterStepEdit", () => {
  it("sin pasos vuelve a pendiente", () => {
    expect(statusAfterStepEdit("en_curso", [])).toBe("pendiente");
    expect(statusAfterStepEdit("lista", [])).toBe("pendiente");
  });
  it("agregar un paso a una actividad lista la regresa a en_curso", () => {
    expect(statusAfterStepEdit("lista", [{ done: true }, { done: false }])).toBe("en_curso");
  });
  it("si los pasos restantes están todos hechos pasa a lista", () => {
    expect(statusAfterStepEdit("en_curso", [{ done: true }])).toBe("lista");
  });
  it("con un solo paso pendiente se queda como estaba", () => {
    expect(statusAfterStepEdit("pendiente", [{ done: false }])).toBe("pendiente");
  });
  it("nunca cambia una actividad cerrada", () => {
    expect(statusAfterStepEdit("entregada", [])).toBe("entregada");
    expect(statusAfterStepEdit("cancelada", [{ done: false }])).toBe("cancelada");
  });
});
