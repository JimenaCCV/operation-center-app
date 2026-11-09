import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { dueText, longDate, STATUS_LABEL, URGENCY_CLASS } from "../format";
import type { Activity } from "../types";

interface Props {
  activity: Activity;
  /** Se llama con la actividad actualizada que devuelve la API al marcar un paso. */
  onChange: (updated: Activity) => void;
  /** En el detalle el título no es un enlace y se muestra el brief. */
  detail?: boolean;
}

export function ActivityCard({ activity: a, onChange, detail = false }: Props) {
  // Mientras la API responde se muestra ya el valor nuevo (actualización optimista); si falla, vuelve al anterior.
  const [pending, setPending] = useState<{ stepId: string; done: boolean } | null>(null);
  const [error, setError] = useState("");
  const closed = a.status === "entregada" || a.status === "cancelada";
  const next = a.steps.find((s) => !s.done);
  const pct = a.progress.total ? (a.progress.done / a.progress.total) * 100 : 0;

  async function toggle(stepId: string, done: boolean) {
    setPending({ stepId, done });
    setError("");
    try {
      const { activity } = await api.setStep(a.id, stepId, done);
      onChange(activity);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el cambio.");
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="card" aria-label={a.title}>
      <div className="cardtop">
        <div>
          {a.course && <div className="label">{a.course}</div>}
          <h2>{detail ? a.title : <Link to={`/actividades/${a.id}`}>{a.title}</Link>}</h2>
        </div>
        <div className="pills">
          <span className={`pill ${URGENCY_CLASS[a.urgency]}`}>{dueText(a.dueAt, a.urgency)}</span>
          <span className="pill state">{STATUS_LABEL[a.status]}</span>
        </div>
      </div>

      {a.dueAt && <div className="sub">Entrega: {longDate(a.dueAt)}</div>}
      {detail && a.brief && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.brief}</p>}

      {a.progress.total > 0 && (
        <div
          className="progress"
          role="progressbar"
          aria-label="Avance"
          aria-valuemin={0}
          aria-valuemax={a.progress.total}
          aria-valuenow={a.progress.done}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      )}

      {!closed && next && (
        <div className="next">
          <b>Siguiente paso: </b>
          {next.text}
        </div>
      )}

      {a.steps.length > 0 && (
        <div className="items">
          {a.steps.map((s) => {
            const id = `step-${a.id}-${s.id}`;
            return (
              <div key={s.id} className={`item${s.done ? " done" : ""}`}>
                <input
                  type="checkbox"
                  id={id}
                  checked={pending?.stepId === s.id ? pending.done : s.done}
                  disabled={pending !== null || closed}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                />
                <label htmlFor={id} className="txt">
                  {s.text}
                </label>
                <span className="min">{s.estimateMin} min</span>
              </div>
            );
          })}
        </div>
      )}
      {a.steps.length === 0 && <p className="sub" style={{ margin: 0 }}>Esta actividad todavía no tiene pasos.</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </article>
  );
}
