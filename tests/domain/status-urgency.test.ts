import { describe, expect, it } from "vitest";
import { deriveStatus, isClosed, remainingMinutes } from "../../src/domain/status";
import { urgency, urgencyRange } from "../../src/domain/urgency";

const now = new Date("2026-10-15T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 36e5);

describe("urgency", () => {
  it.each([
    [-1, "vencida"],
    [0, "critica"],
    [23.9, "critica"],
    [24, "pronto"],
    [71.9, "pronto"],
    [72, "holgada"],
  ])("a %s horas de la entrega es %s", (h, expected) => {
    expect(urgency(inHours(h), now)).toBe(expected);
  });

  it("sin fecha es sin_fecha", () => {
    expect(urgency(null, now)).toBe("sin_fecha");
  });

  it("urgencyRange coincide con urgency() en los bordes", () => {
    const inRange = (level: Parameters<typeof urgencyRange>[0], d: Date) => {
      const r = urgencyRange(level, now);
      if (!r) return false;
      return (r.$gte === undefined || d >= r.$gte) && (r.$lt === undefined || d < r.$lt);
    };
    for (const h of [-5, 0, 10, 24, 50, 72, 200]) {
      const level = urgency(inHours(h), now);
      expect(inRange(level, inHours(h))).toBe(true);
    }
  });
});

describe("deriveStatus", () => {
  it("todos los pasos hechos → lista", () => {
    expect(deriveStatus("en_curso", [{ done: true }, { done: true }])).toBe("lista");
  });
  it("algunos hechos → en_curso", () => {
    expect(deriveStatus("pendiente", [{ done: true }, { done: false }])).toBe("en_curso");
  });
  it("desmarcar un paso de una actividad lista la regresa a en_curso", () => {
    expect(deriveStatus("lista", [{ done: true }, { done: false }])).toBe("en_curso");
  });
  it("nunca reabre una actividad entregada o cancelada", () => {
    expect(deriveStatus("entregada", [{ done: false }])).toBe("entregada");
    expect(deriveStatus("cancelada", [{ done: true }])).toBe("cancelada");
  });
  it("sin pasos conserva el estado", () => {
    expect(deriveStatus("pendiente", [])).toBe("pendiente");
  });
});

describe("helpers", () => {
  it("isClosed", () => {
    expect(isClosed("entregada")).toBe(true);
    expect(isClosed("pendiente")).toBe(false);
  });
  it("remainingMinutes suma solo los pasos pendientes", () => {
    expect(
      remainingMinutes([
        { done: true, estimateMin: 30 },
        { done: false, estimateMin: 15 },
        { done: false, estimateMin: 20 },
      ]),
    ).toBe(35);
  });
});
