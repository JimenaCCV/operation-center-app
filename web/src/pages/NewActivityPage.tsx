import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { dateToDueAt } from "../format";
import type { NewActivityInput } from "../types";

interface DraftStep {
  key: number;
  text: string;
  min: string;
}

let nextKey = 1;
const blankStep = (): DraftStep => ({ key: nextKey++, text: "", min: "15" });

export function NewActivityPage() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<DraftStep[]>([blankStep()]);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const update = (key: number, patch: Partial<DraftStep>) =>
    setSteps((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: NewActivityInput = {
      title: String(f.get("title")).trim(),
      steps: steps
        .filter((s) => s.text.trim())
        .map((s) => ({ text: s.text.trim(), estimateMin: Number(s.min) || 15 })),
    };
    const course = String(f.get("course")).trim();
    const brief = String(f.get("brief")).trim();
    const due = String(f.get("due"));
    if (course) input.course = course;
    if (brief) input.brief = brief;
    if (due) input.dueAt = dateToDueAt(due);

    setBusy(true);
    setError("");
    setDetails([]);
    try {
      const { activity } = await api.createActivity(input);
      navigate(`/actividades/${activity.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setDetails(err.details.map((d) => `${d.field}: ${d.message}`));
      } else setError("Ocurrió un error inesperado.");
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h1 style={{ fontSize: 26, marginBottom: 14 }}>Nueva actividad</h1>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Título</span>
          <input name="title" required maxLength={200} placeholder="Ej. Sprint 4: login" />
        </label>
        <div className="row">
          <label className="field">
            <span>Materia o proyecto (opcional)</span>
            <input name="course" maxLength={100} />
          </label>
          <label className="field">
            <span>Fecha de entrega (opcional)</span>
            <input name="due" type="date" />
          </label>
        </div>
        <label className="field">
          <span>Descripción (opcional)</span>
          <textarea name="brief" maxLength={2000} />
        </label>

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
          <legend className="label" style={{ marginBottom: 6 }}>
            Pasos (en el orden en que se hacen)
          </legend>
          {steps.map((s, i) => (
            <div className="stepedit" key={s.key}>
              <input
                aria-label={`Paso ${i + 1}`}
                value={s.text}
                maxLength={300}
                placeholder={`Paso ${i + 1}`}
                onChange={(e) => update(s.key, { text: e.target.value })}
              />
              <input
                aria-label={`Minutos del paso ${i + 1}`}
                type="number"
                min={1}
                max={480}
                value={s.min}
                onChange={(e) => update(s.key, { min: e.target.value })}
              />
              <button
                type="button"
                className="btn ghost small"
                aria-label={`Quitar paso ${i + 1}`}
                disabled={steps.length === 1}
                onClick={() => setSteps((list) => list.filter((x) => x.key !== s.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <div>
            <button type="button" className="btn ghost small" disabled={steps.length >= 50} onClick={() => setSteps((l) => [...l, blankStep()])}>
              + Agregar paso
            </button>
          </div>
        </fieldset>

        {error && (
          <div role="alert">
            <p className="err">{error}</p>
            {details.map((d) => (
              <p className="err" key={d}>
                · {d}
              </p>
            ))}
          </div>
        )}
        <div className="actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Crear actividad"}
          </button>
          <Link to="/" className="btn ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
