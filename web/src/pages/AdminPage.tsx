import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { User } from "../types";

export function AdminPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .users()
      .then((r) => {
        setUsers(r.users);
        setTotal(r.total);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la lista."));
  }, []);

  return (
    <section className="panel">
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Usuarios</h1>
      <p className="sub">{users ? `${total} cuenta${total === 1 ? "" : "s"} registrada${total === 1 ? "" : "s"}` : " "}</p>
      {error && <p className="err" role="alert">{error}</p>}
      {!users && !error && <p className="empty">Cargando…</p>}
      {users && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
