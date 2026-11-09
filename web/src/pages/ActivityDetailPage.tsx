import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { ActivityCard } from "../components/ActivityCard";
import { duration } from "../format";
import type { Activity } from "../types";

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
          <ActivityCard activity={activity} onChange={setActivity} detail />
          <p className="sub" style={{ margin: 0 }}>
            {activity.remainingMin > 0 ? `Faltan unos ${duration(activity.remainingMin)} de trabajo.` : "No quedan pasos pendientes."}
          </p>
        </>
      )}
    </>
  );
}
