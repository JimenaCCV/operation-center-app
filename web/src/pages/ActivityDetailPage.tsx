import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { ActivityCard } from "../components/ActivityCard";
import { dateToDueAt, dueAtToDate, duration } from "../format";
import type { Activity, UpdateActivityInput } from "../types";

export function ActivityDetailPage() {
  const { id = "" } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stale = false;
    setActivity(null);
    setError("");
    api
      .getActivity(id)
      .then((r) => {
        if (!stale) setActivity(r.activity);
      })
      .catch((e: unknown) => {
        if (!stale) setError(e instanceof ApiError && e.status === 404 ? "Esa actividad no existe." : e instanceof ApiError ? e.message : "No se pudo cargar.");
      });
    return () => {
      stale = true;
    };
  }, [id]);

  return (
    <>
      <p style={{ margin: 0 }}>
        <Link to="/">← Volver a hoy</Link>
      </p>
      {error && <p className="err" role="alert">{error}</p>}
      {!activity && !error && <p className="empty">Cargando…</p>}
      {activity && (
        <>
          <ActivityCard activity={activity} onChange={setActivity} detail editable />
          <p className="sub" style={{ margin: 0 }}>
            {activity.remainingMin > 0 ? `Faltan unos ${duration(activity.remainingMin)} de trabajo.` : "No quedan pasos pendientes."}
          </p>
          <ActivityActions activity={activity} onChange={setActivity} />
        </>
      )}
    </>
  );
}

type Mode = "idle" | "edit" | "confirm-cancel" | "confirm-delete";

/** Editar datos, entregar, cancelar y eliminar. Las confirmaciones se hacen en la página (sin window.confirm). */
function ActivityActions({ activity: a, onChange }: { activity: Activity; onChange: (a: Activity) => void }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const closed = a.status === "entregada" || a.status === "cancelada";

  function fail(e: unknown) {
    if (e instanceof ApiError) {
      setError(e.message);
      setDetails(e.details.map((d) => `${d.field}: ${d.message}`));
    } else setError("Ocurrió un error inesperado.");
  }

  async function update(input: UpdateActivityInput) {
    setBusy(true);
    setError("");
    setDetails([]);
    try {
      const { activity } = await api.updateActivity(a.id, input);
      onChange(activity);
      setMode("idle");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api.deleteActivity(a.id);
      navigate("/", { replace: true });
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  }

  function go(next: Mode) {
    setMode(next);
    setError("");
    setDetails([]);
  }

  return (
    <section className="panel" aria-label="Acciones de la actividad">
      {mode === "edit" ? (
        <EditForm activity={a} busy={busy} onSave={update} onCancel={() => go("idle")} />
      ) : mode === "confirm-delete" ? (
        <div className="confirm" role="group" aria-label="Confirmar eliminación">
          <p>
            ¿Eliminar <b>{a.title}</b> y todos sus pasos? No se puede deshacer.
          </p>
          <div className="actions">
            <button className="btn danger" disabled={busy} onClick={remove}>
              {busy ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button className="btn ghost" disabled={busy} onClick={() => go("idle")}>
              No, conservarla
            </button>
          </div>
        </div>
      ) : mode === "confirm-cancel" ? (
        <div className="confirm" role="group" aria-label="Confirmar cancelación">
          <p>
            ¿Cancelar <b>{a.title}</b>? Una actividad cancelada ya no se puede editar ni reabrir.
          </p>
          <div className="actions">
            <button className="btn" disabled={busy} onClick={() => update({ status: "cancelada" })}>
              Sí, cancelarla
            </button>
            <button className="btn ghost" disabled={busy} onClick={() => go("idle")}>
              No
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          {!closed && (
            <>
              <button className="btn ghost" onClick={() => go("edit")}>
                Editar
              </button>
              <button className="btn" disabled={busy} onClick={() => update({ status: "entregada" })}>
                Marcar como entregada
              </button>
              <button className="btn ghost" onClick={() => go("confirm-cancel")}>
                Cancelar actividad
              </button>
            </>
          )}
          {closed && <span className="sub">Esta actividad está cerrada: ya no se puede editar.</span>}
          <button className="btn ghost danger" onClick={() => go("confirm-delete")}>
            Eliminar
          </button>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 10 }}>
          <p className="err">{error}</p>
          {details.map((d) => (
            <p className="err" key={d}>
              · {d}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function EditForm({
  activity: a,
  busy,
  onSave,
  onCancel,
}: {
  activity: Activity;
  busy: boolean;
  onSave: (input: UpdateActivityInput) => void;
  onCancel: () => void;
}) {
  const initialDate = dueAtToDate(a.dueAt);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title")).trim();
    const course = String(f.get("course")).trim() || null;
    const brief = String(f.get("brief")).trim() || null;
    const due = String(f.get("due"));

    // Solo se manda lo que cambió (así una fecha sin tocar conserva su hora original).
    const input: UpdateActivityInput = {};
    if (title !== a.title) input.title = title;
    if (course !== a.course) input.course = course;
    if (brief !== a.brief) input.brief = brief;
    if (due !== initialDate) input.dueAt = due ? dateToDueAt(due) : null;

    if (Object.keys(input).length === 0) onCancel();
    else onSave(input);
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>Editar actividad</h2>
      <label className="field">
        <span>Título</span>
        <input name="title" required maxLength={200} defaultValue={a.title} />
      </label>
      <div className="row">
        <label className="field">
          <span>Materia o proyecto (opcional)</span>
          <input name="course" maxLength={100} defaultValue={a.course ?? ""} />
        </label>
        <label className="field">
          <span>Fecha de entrega (vacía = sin fecha)</span>
          <input name="due" type="date" defaultValue={initialDate} />
        </label>
      </div>
      <label className="field">
        <span>Descripción (opcional)</span>
        <textarea name="brief" maxLength={2000} defaultValue={a.brief ?? ""} />
      </label>
      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button className="btn ghost" type="button" onClick={onCancel}>
          Descartar
        </button>
      </div>
    </form>
  );
}
