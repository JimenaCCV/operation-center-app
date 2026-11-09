import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="wrap">
      <header className="topbar">
        <Link to="/" className="brand">
          Centro de operaciones
        </Link>
        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>
            Hoy
          </NavLink>
          <NavLink to="/actividades/nueva">Nueva actividad</NavLink>
          {user?.role === "admin" && <NavLink to="/admin">Usuarios</NavLink>}
          <span className="sub">{user?.name}</span>
          <button
            className="btn ghost small"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Salir
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
