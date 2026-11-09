import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { duration } from "../format";
import type { SessionPlan } from "../types";
import { loadJson, saveJson } from "./storage";

const OPTIONS = [
  { min: 20, label: "20 min" },
  { min: 45, label: "45 min" },
  { min: 90, label: "1 h 30" },
  { min: 1440, label: "Todo de una vez" }, // 1440 es el máximo que acepta la API
];

/** «¿Cuánto tiempo tienes?» → pide a GET /api/plan una sesión de ese tamaño. */
export function Planner({ refreshKey }: { refreshKey: number }) {
  const [minutes, setMinutes] = useState<number>(() => loadJson("op.minutes", 90));
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stale = false;
    api
      .plan(minutes)
      .then((p) => {
        if (!stale) {
          setPlan(p);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (!stale) setError(e instanceof ApiError ? e.message : "No se pudo armar el plan.");
      });
    return () => {
      stale = true;
    };
  }, [minutes, refreshKey]);

  function pick(min: number) {
    setMinutes(min);
    saveJson("op.minutes", min);
  }

  let note = "";
  if (plan) {
    if (plan.steps.length === 0) note = "No tienes pasos pendientes. Buen trabajo.";
    else if (minutes >= 1440) note = `Sesión completa: unos ${duration(plan.totalMin)} en total. Haz una pausa corta a la mitad.`;
    else
      note =
        `Unos ${duration(plan.totalMin)} de trabajo.` +
        (plan.remaining > 0 ? ` Quedan ${plan.remaining} paso${plan.remaining > 1 ? "s" : ""} para otra sesión.` : " Con esto terminas.");
  }

  return (
    <section className="panel" aria-labelledby="plan-h">
      <h2 id="plan-h">¿Cuánto tiempo tienes hoy?</h2>
      <div className="chips" role="group" aria-label="Tiempo disponible">
        {OPTIONS.map((o) => (
          <button key={o.min} className="chip" aria-pressed={minutes === o.min} onClick={() => pick(o.min)}>
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {plan && plan.steps.length > 0 && (
        <ol className="steps">
          {plan.steps.map((s) => (
            <li key={s.stepId}>
              <span className="t">+{s.startsAtMin}′</span>
              <span>
                {s.text} · <Link to={`/actividades/${s.activityId}`}>{s.activityTitle}</Link>
              </span>
            </li>
          ))}
        </ol>
      )}
      {note && <p className="note">{note}</p>}
    </section>
  );
}
