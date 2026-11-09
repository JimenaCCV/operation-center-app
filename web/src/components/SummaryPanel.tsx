import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { dueText, duration, URGENCY_CLASS } from "../format";
import type { Summary } from "../types";

/** Resumen de carga (GET /api/summary). Se vuelve a pedir cuando cambia `refreshKey`. */
export function SummaryPanel({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stale = false;
    api
      .summary()
      .then((s) => {
        if (!stale) {
          setSummary(s);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (!stale) setError(e instanceof ApiError ? e.message : "No se pudo cargar el resumen.");
      });
    return () => {
      stale = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <section className="panel" aria-label="Resumen de carga">
        <p className="err" role="alert">{error}</p>
      </section>
    );
  }
  if (!summary) return null;

  const s = summary;
  const stats = [
    { label: "Abiertas", value: String(s.open) },
    { label: "Vencidas", value: String(s.byUrgency.vencida), alert: s.byUrgency.vencida > 0 },
    { label: "Menos de 24 h", value: String(s.byUrgency.critica), alert: s.byUrgency.critica > 0 },
    { label: "Pasos pendientes", value: String(s.pendingSteps) },
    { label: "Tiempo restante", value: duration(s.remainingMin) },
  ];

  return (
    <section className="panel summary" aria-labelledby="summary-h">
      <h2 id="summary-h" className="label">
        Tu carga
      </h2>
      <dl className="stats">
        {stats.map((st) => (
          <div key={st.label} className={st.alert ? "alert" : undefined}>
            <dt>{st.label}</dt>
            <dd>{st.value}</dd>
          </div>
        ))}
      </dl>
      <p className="nextdue">
        {s.nextDue ? (
          <>
            <span className="sub">Próxima entrega: </span>
            <Link to={`/actividades/${s.nextDue.id}`}>{s.nextDue.title}</Link>{" "}
            <span className={`pill ${URGENCY_CLASS[s.nextDue.urgency]}`}>{dueText(s.nextDue.dueAt, s.nextDue.urgency)}</span>
          </>
        ) : (
          <span className="sub">{s.open === 0 ? "No tienes actividades abiertas." : "Ninguna actividad abierta tiene fecha próxima."}</span>
        )}
      </p>
    </section>
  );
}
