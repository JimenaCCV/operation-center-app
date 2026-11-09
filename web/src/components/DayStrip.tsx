import { useEffect, useState, type FormEvent } from "react";
import { clock, nowInTz } from "../format";
import { loadJson, saveJson } from "./storage";

interface Availability {
  start: number;
  end: number;
  flexEnd: number;
}

const DEFAULT: Availability = { start: 13, end: 20, flexEnd: 22 };
const KEY = "op.availability";

const pct = (h: number) => `${(h / 24) * 100}%`;

/**
 * Franja del día: ventana de disponibilidad y marca de «ahora».
 * El back no guarda horarios, así que se recuerdan en este navegador.
 */
export function DayStrip() {
  const [av, setAv] = useState<Availability>(() => loadJson(KEY, DEFAULT));
  const [now, setNow] = useState(() => nowInTz());

  useEffect(() => {
    const id = setInterval(() => setNow(nowInTz()), 60_000);
    return () => clearInterval(id);
  }, []);

  let message: string;
  if (now.hour < av.start) message = `Tu ventana abre a las ${clock(av.start)}`;
  else if (now.hour < av.end) message = "Disponible ahora";
  else if (now.hour < av.flexEnd) message = `Tiempo flexible · hasta las ${clock(av.flexEnd)}`;
  else message = `Fuera de horario · mañana a las ${clock(av.start)}`;

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = { start: Number(f.get("start")), end: Number(f.get("end")), flexEnd: Number(f.get("flexEnd")) };
    if (!(next.start < next.end && next.end <= next.flexEnd)) return;
    setAv(next);
    saveJson(KEY, next);
  }

  return (
    <section className="panel day" aria-label="Tu disponibilidad de hoy">
      <div>
        <div className="label">{now.label}</div>
        <div className="dayhead">
          <span className="status">{message}</span>
          <span className="label">
            Disponible {clock(av.start)}–{clock(av.end)} · flexible hasta {clock(av.flexEnd)}
          </span>
        </div>
      </div>
      <div className="bar">
        <div className="win" style={{ left: pct(av.start), width: pct(av.end - av.start) }} />
        <div className="flex" style={{ left: pct(av.end), width: pct(av.flexEnd - av.end) }} />
        <div className="nowmark" style={{ left: pct(now.hour) }} />
      </div>
      <div className="ticks">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <details>
        <summary>Cambiar mi horario</summary>
        <form className="row" onSubmit={save}>
          <label className="field">
            <span>Desde (hora)</span>
            <input name="start" type="number" min={0} max={23} step={0.5} defaultValue={av.start} />
          </label>
          <label className="field">
            <span>Hasta (hora)</span>
            <input name="end" type="number" min={1} max={24} step={0.5} defaultValue={av.end} />
          </label>
          <label className="field">
            <span>Flexible hasta</span>
            <input name="flexEnd" type="number" min={1} max={24} step={0.5} defaultValue={av.flexEnd} />
          </label>
          <div className="actions">
            <button className="btn small" type="submit">
              Guardar
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
