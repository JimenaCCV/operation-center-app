import type { Status, Urgency } from "./types";

export const TZ = "America/Mexico_City";

export const STATUS_LABEL: Record<Status, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  lista: "Lista para entregar",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  vencida: "Vencida",
  critica: "Menos de 24 h",
  pronto: "Menos de 72 h",
  holgada: "Con holgura",
  sin_fecha: "Sin fecha",
};

/** Clase CSS del color de la píldora de urgencia. */
export const URGENCY_CLASS: Record<Urgency, string> = {
  vencida: "due-crit",
  critica: "due-crit",
  pronto: "due-warn",
  holgada: "due-ok",
  sin_fecha: "due-none",
};

export function dueText(iso: string | null, urgency: Urgency, now = new Date()): string {
  if (!iso) return "Sin fecha";
  if (urgency === "vencida") return "Vencida";
  const hrs = (new Date(iso).getTime() - now.getTime()) / 36e5;
  return hrs < 24 ? `Entrega en ${Math.max(1, Math.round(hrs))} h` : `Entrega en ${Math.round(hrs / 24)} d`;
}

export function longDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function duration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} h${r ? ` ${r} min` : ""}` : `${m} min`;
}

export function clock(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

/** Hora actual en la zona de la usuaria, como número decimal (13.5 = 13:30), y etiqueta del día. */
export function nowInTz(now = new Date()): { hour: number; label: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", {
      timeZone: TZ,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "long",
      day: "numeric",
      month: "long",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const label = `${parts.weekday} ${parts.day} de ${parts.month}`;
  return { hour: (Number(parts.hour) % 24) + Number(parts.minute) / 60, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

/** Al revés que dateToDueAt: la fecha de entrega como "2026-11-20" (día en hora de México) para un <input type="date">. */
export function dueAtToDate(iso: string | null): string {
  if (!iso) return "";
  // en-CA formatea como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Un <input type="date"> da "2026-11-20"; la entrega se interpreta a las 23:59 hora de México. */
export function dateToDueAt(date: string): string {
  return new Date(`${date}T23:59:00-06:00`).toISOString();
}
