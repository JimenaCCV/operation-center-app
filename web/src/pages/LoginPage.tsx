import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";

export function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setBusy(true);
    setError("");
    setDetails([]);
    try {
      if (mode === "login") await login(email, password);
      else await register(String(f.get("name")), email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setDetails(err.details.map((d) => d.message));
      } else setError("Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <div className="panel auth">
        <div className="label">Centro de operaciones</div>
        <h1>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h1>
        <p className="sub">Organiza tus entregas y arma una sesión del tamaño del tiempo que tengas.</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === "login"} className="chip" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
            Entrar
          </button>
          <button role="tab" aria-selected={mode === "register"} className="chip" aria-pressed={mode === "register"} onClick={() => setMode("register")}>
            Registrarme
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          {mode === "register" && (
            <label className="field">
              <span>Nombre</span>
              <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Correo</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Contraseña{mode === "register" ? " (mínimo 8 caracteres)" : ""}</span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              maxLength={72}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
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
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}
