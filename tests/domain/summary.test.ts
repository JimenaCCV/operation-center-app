import { describe, expect, it } from "vitest";
import type { ActivityStatus } from "../../src/domain/status";
import { summarize, type SummaryActivity } from "../../src/domain/summary";

const now = new Date("2026-10-15T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 36e5);

let n = 0;
const act = (
  status: ActivityStatus,
  dueAt: Date | null,
  steps: { done: boolean; estimateMin: number }[] = [],
): SummaryActivity => ({ id: `a${++n}`, title: `Actividad ${n}`, status, dueAt, steps });

describe("summarize", () => {
  it("sin actividades → todo en cero y nextDue null", () => {
    expect(summarize([], now)).toEqual({
      total: 0,
      open: 0,
      byStatus: { pendiente: 0, en_curso: 0, lista: 0, entregada: 0, cancelada: 0 },
      byUrgency: { vencida: 0, critica: 0, pronto: 0, holgada: 0, sin_fecha: 0 },
      pendingSteps: 0,
      remainingMin: 0,
      nextDue: null,
    });
  });

  it("mezcla de estados: byStatus cuenta todas; el trabajo, solo las abiertas", () => {
    const s = summarize(
      [
        act("pendiente", inHours(10), [{ done: false, estimateMin: 30 }, { done: false, estimateMin: 15 }]),
        act("en_curso", inHours(48), [{ done: true, estimateMin: 20 }, { done: false, estimateMin: 25 }]),
        act("lista", inHours(200), [{ done: true, estimateMin: 10 }]),
        act("pendiente", null, [{ done: false, estimateMin: 5 }]),
        act("entregada", inHours(5), [{ done: false, estimateMin: 100 }]),
        act("cancelada", inHours(-5), [{ done: false, estimateMin: 100 }]),
      ],
      now,
    );
    expect(s.total).toBe(6);
    expect(s.open).toBe(4);
    expect(s.byStatus).toEqual({ pendiente: 2, en_curso: 1, lista: 1, entregada: 1, cancelada: 1 });
    // Las cerradas no suman a urgencia, pasos ni minutos (aunque tengan pasos pendientes o estén vencidas).
    expect(s.byUrgency).toEqual({ vencida: 0, critica: 1, pronto: 1, holgada: 1, sin_fecha: 1 });
    expect(s.pendingSteps).toBe(4);
    expect(s.remainingMin).toBe(75);
  });

  it("nextDue es la abierta con la fecha futura más cercana; ignora vencidas, sin fecha y cerradas", () => {
    const soonClosed = act("entregada", inHours(1));
    const overdue = act("pendiente", inHours(-2));
    const noDate = act("pendiente", null);
    const later = act("en_curso", inHours(80));
    const next = act("pendiente", inHours(30));
    const s = summarize([soonClosed, overdue, noDate, later, next], now);
    expect(s.nextDue).toEqual({ id: next.id, title: next.title, dueAt: next.dueAt, urgency: "pronto" });
    expect(s.byUrgency.vencida).toBe(1);
  });

  it("si solo hay vencidas o sin fecha, nextDue es null", () => {
    expect(summarize([act("pendiente", inHours(-1)), act("lista", null)], now).nextDue).toBeNull();
  });

  it("borde de 24 h: 23.9 h es crítica, 24 h ya es pronto; una entrega justo ahora cuenta como siguiente", () => {
    const s = summarize([act("pendiente", inHours(24)), act("pendiente", inHours(23.9))], now);
    expect(s.byUrgency).toMatchObject({ critica: 1, pronto: 1 });
    expect(s.nextDue?.urgency).toBe("critica");

    const atNow = act("pendiente", now);
    expect(summarize([atNow], now).nextDue).toMatchObject({ id: atNow.id, urgency: "critica" });
  });
});
