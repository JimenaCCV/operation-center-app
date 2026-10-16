export const URGENCY_LEVELS = ["vencida", "critica", "pronto", "holgada", "sin_fecha"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

const HOUR_MS = 36e5;

/** Urgencia por fecha de entrega: crítica en menos de 24 h, pronto en menos de 72 h. */
export function urgency(dueAt: Date | null, now: Date): Urgency {
  if (!dueAt) return "sin_fecha";
  const hrs = (dueAt.getTime() - now.getTime()) / HOUR_MS;
  if (hrs < 0) return "vencida";
  if (hrs < 24) return "critica";
  if (hrs < 72) return "pronto";
  return "holgada";
}

/**
 * Rango de `dueAt` que corresponde a cada nivel, para filtrar en la base de datos
 * con el mismo criterio que `urgency()`. `null` significa «sin fecha».
 */
export function urgencyRange(level: Urgency, now: Date): { $lt?: Date; $gte?: Date } | null {
  const t = now.getTime();
  switch (level) {
    case "vencida":
      return { $lt: now };
    case "critica":
      return { $gte: now, $lt: new Date(t + 24 * HOUR_MS) };
    case "pronto":
      return { $gte: new Date(t + 24 * HOUR_MS), $lt: new Date(t + 72 * HOUR_MS) };
    case "holgada":
      return { $gte: new Date(t + 72 * HOUR_MS) };
    case "sin_fecha":
      return null;
  }
}
