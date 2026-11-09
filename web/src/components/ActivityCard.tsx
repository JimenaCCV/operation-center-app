import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { dueText, longDate, STATUS_LABEL, URGENCY_CLASS } from "../format";
import type { Activity } from "../types";

const MAX_STEPS = 50;

interface Props {
  activity: Activity;
  /** Se llama con la actividad actualizada que devuelve la API al cambiar un paso. */
  onChange: (updated: Activity) => void;
  /** En el detalle el título no es un enlace y se muestra el brief. */
  detail?: boolean;
  /** Muestra los controles para agregar, editar y quitar pasos (se ocultan si la actividad está cerrada). */
  editable?: boolean;
}

export function ActivityCard({ activity: a, onChange, detail = false, editable = false }: Props) {
  // Mientras la API responde se muestra ya el valor nuevo (actualización optimista); si falla, vuelve al anterior.
  const [pending, setPending] = useState<{ stepId: string; done: boolean } | null>(null);
  const [editing, setEditing] = useState<{ stepId: string; text: string; min: string } | null>(null);
  const [newStep, setNewStep] = useState({ text: "", min: "15" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const closed = a.status === "entregada" || a.status === "cancelada";
  const canEdit = editable && !closed;
  const next = a.steps.find((s) => !s.done);
  const pct = a.progress.total ? (a.progress.done / a.progress.total) * 100 : 0;

  /** Llama a la API, entrega la actividad actualizada y muestra el mensaje de error (p. ej. un 409) si falla. */
  async function run(call: () => Promise<{ activity: Activity }>): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const { activity } = await call();
      onChange(activity);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el cambio.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggle(stepId: string, done: boolean) {
    setPending({ stepId, done });
    await run(() => api.setStep(a.id, stepId, done));
    setPending(null);
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const ok = await run(() =>
      api.updateStep(a.id, editing.stepId, { text: editing.text.trim(), estimateMin: Number(editing.min) || 15 }),
    );
    if (ok) setEditing(null);
  }

  async function submitNew(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = newStep.text.trim();
    if (!text) return;
    const ok = await run(() => api.addStep(a.id, { text, estimateMin: Number(newStep.min) || 15 }));
    if (ok) setNewStep({ text: "", min: newStep.min });
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
          {a.steps.map((s, i) => {
            if (canEdit && editing?.stepId === s.id) {
              return (
                <form key={s.id} className="stepedit" onSubmit={saveEdit}>
                  <input
                    aria-label={`Texto del paso ${i + 1}`}
                    value={editing.text}
                    required
                    maxLength={300}
                    autoFocus
                    onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  />
                  <input
                    aria-label={`Minutos del paso ${i + 1}`}
                    type="number"
                    min={1}
                    max={480}
                    required
                    value={editing.min}
                    onChange={(e) => setEditing({ ...editing, min: e.target.value })}
                  />
                  <span className="acts">
                    <button className="btn small" type="submit" disabled={busy}>
                      Guardar
                    </button>
                    <button className="btn ghost small" type="button" onClick={() => setEditing(null)}>
                      Cancelar
                    </button>
                  </span>
                </form>
              );
            }
            const id = `step-${a.id}-${s.id}`;
            return (
              <div key={s.id} className={`item${s.done ? " done" : ""}${canEdit ? " editable" : ""}`}>
                <input
                  type="checkbox"
                  id={id}
                  checked={pending?.stepId === s.id ? pending.done : s.done}
                  disabled={pending !== null || busy || closed}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                />
                <label htmlFor={id} className="txt">
                  {s.text}
                </label>
                <span className="min">{s.estimateMin} min</span>
                {canEdit && (
                  <span className="acts">
                    <button
                      type="button"
                      className="btn ghost small"
                      aria-label={`Editar paso ${i + 1}`}
                      disabled={busy}
                      onClick={() => setEditing({ stepId: s.id, text: s.text, min: String(s.estimateMin) })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn ghost small"
                      aria-label={`Quitar paso ${i + 1}`}
                      disabled={busy}
                      onClick={() => run(() => api.deleteStep(a.id, s.id))}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {a.steps.length === 0 && <p className="sub" style={{ margin: 0 }}>Esta actividad todavía no tiene pasos.</p>}

      {canEdit &&
        (a.steps.length < MAX_STEPS ? (
          <form className="stepedit" onSubmit={submitNew} aria-label="Agregar paso">
            <input
              aria-label="Nuevo paso"
              placeholder="Nuevo paso"
              maxLength={300}
              value={newStep.text}
              onChange={(e) => setNewStep({ ...newStep, text: e.target.value })}
            />
            <input
              aria-label="Minutos del nuevo paso"
              type="number"
              min={1}
              max={480}
              value={newStep.min}
              onChange={(e) => setNewStep({ ...newStep, min: e.target.value })}
            />
            <button className="btn ghost small" type="submit" disabled={busy || !newStep.text.trim()}>
              + Agregar
            </button>
          </form>
        ) : (
          <p className="sub" style={{ margin: 0 }}>Llegaste al máximo de {MAX_STEPS} pasos.</p>
        ))}

      {error && <p className="err" role="alert">{error}</p>}
    </article>
  );
}
