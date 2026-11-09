import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { ActivityDetailPage } from "./pages/ActivityDetailPage";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NewActivityPage } from "./pages/NewActivityPage";

/** Rutas que exigen sesión; sin ella se manda al login. */
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <p className="empty">Cargando…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Ruta solo para administradores. */
function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="actividades/nueva" element={<NewActivityPage />} />
          <Route path="actividades/:id" element={<ActivityDetailPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
