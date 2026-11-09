import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type ListFilters } from "../api";
import { ActivityCard } from "../components/ActivityCard";
import { DayStrip } from "../components/DayStrip";
import { Planner } from "../components/Planner";
import { SummaryPanel } from "../components/SummaryPanel";
import { STATUS_LABEL, URGENCY_LABEL } from "../format";
import { STATUSES, URGENCIES, type Activity } from "../types";

const PAGE = 10;

export function HomePage() {
  const [filters, setFilters] = useState<ListFilters>({});
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Sube cada vez que un paso cambia, para que el plan y el resumen se recalculen.
  const [planKey, setPlanKey] = useState(0);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    api
      .listActivities({ ...filters, limit: PAGE, offset })
      .then((r) => {
        if (stale) return;
        setItems(r.activities);
        setTotal(r.total);
        setError("");
      })
      .catch((e: unknown) => {
        if (!stale) setError(e instanceof ApiError ? e.message : "No se pudieron cargar las actividades.");
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [filters, offset]);

  const onChange = useCallback((updated: Activity) => {
    setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setPlanKey((k) => k + 1);
  }, []);

  function setFilter(key: "status" | "urgency", value: string) {
    setOffset(0);
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  function submitCourse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const course = String(new FormData(e.currentTarget).get("course")).trim();
    setOffset(0);
    setFilters((f) => ({ ...f, course: course || undefined }));
  }

  const hasFilters = Boolean(filters.course || filters.status || filters.urgency);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <>
      <DayStrip />
      <SummaryPanel refreshKey={planKey} />
      <Planner refreshKey={planKey} />

      <section aria-label="Actividades" className="cards">
        <div className="panel">
          <div className="filters">
            <form className="field" onSubmit={submitCourse}>
              <span>Materia</span>
              <input name="course" defaultValue={filters.course ?? ""} maxLength={100} placeholder="Nombre exacto + Enter" />
            </form>
            <label className="field">
              <span>Estado</span>
              <select value={filters.status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
                <option value="">Todos</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Urgencia</span>
              <select value={filters.urgency ?? ""} onChange={(e) => setFilter("urgency", e.target.value)}>
                <option value="">Todas</option>
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {URGENCY_LABEL[u]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        {loading && items.length === 0 && <p className="empty">Cargando…</p>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">
            {hasFilters ? (
              "Ninguna actividad coincide con esos filtros."
            ) : (
              <>
                Aquí aparecerán tus actividades con su fecha, su avance y el siguiente paso.{" "}
                <Link to="/actividades/nueva">Agrega la primera</Link>.
              </>
            )}
          </div>
        )}

        {items.map((a) => (
          <ActivityCard key={a.id} activity={a} onChange={onChange} />
        ))}

        {total > PAGE && (
          <div className="pager">
            <button className="btn ghost small" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
              ← Anteriores
            </button>
            <span className="sub">
              {from}–{to} de {total}
            </span>
            <button className="btn ghost small" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
              Siguientes →
            </button>
          </div>
        )}
      </section>
    </>
  );
}
