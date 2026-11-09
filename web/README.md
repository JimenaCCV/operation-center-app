# Centro de Operaciones · front web

Interfaz web (React 19 + Vite + TypeScript) para la API de este repositorio. Retoma el diseño de la primera versión del «Centro de operaciones» que vivía en el navegador: franja del día, planificador por minutos disponibles y tarjetas de actividad con checklist.

## Cómo correrlo

Necesitas el back corriendo (ver el README de la raíz: MongoDB + `npm run dev`, puerto 3000).

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

En desarrollo, Vite reenvía `/api` a `http://127.0.0.1:3000` (`vite.config.ts`), así que el navegador ve un solo origen. Si el back usa otro puerto: `VITE_API_TARGET=http://127.0.0.1:4000 npm run dev`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga |
| `npm run typecheck` | Verifica tipos |
| `npm run build` | Tipos + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en el puerto 5173 (con el mismo proxy) |

## Pantallas

| Ruta | Qué hace | Endpoints |
|---|---|---|
| `/login` | Entrar o registrarse | `POST /auth/login`, `POST /auth/register` |
| `/` | Franja del día, planificador (20 min, 45 min, 1 h 30, todo) y actividades con filtros (materia, estado, urgencia) y paginación | `GET /plan`, `GET /activities` |
| `/actividades/nueva` | Crear una actividad con sus pasos y minutos estimados | `POST /activities` |
| `/actividades/:id` | Detalle; marcar y desmarcar pasos | `GET /activities/:id`, `PATCH /activities/:id/steps/:stepId` |
| `/admin` | Lista de usuarios (solo `admin`) | `GET /users` |

## Decisiones

- **Sesión:** el JWT se guarda en `localStorage`. Cuando la API responde 401 con un token guardado (vencido, 1 h por defecto), la app cierra la sesión y manda al login.
- **Rutas protegidas:** `RequireAuth` y `RequireAdmin` en `src/App.tsx`. El back sigue siendo quien decide los permisos; el front solo oculta lo que no corresponde.
- **Estado:** sin librerías; `useState`/`useEffect` y un contexto para la sesión. Cada tarjeta actualiza con la actividad que devuelve la API.
- **Marcar un paso** se refleja al instante y se revierte si la API falla.
- **Horario de disponibilidad:** el back no lo guarda, así que se recuerda en el navegador (`localStorage`).
- **Fechas de entrega:** el formulario manda las 23:59 hora de México (UTC−6).
- **Fuera de alcance por ahora** (el back aún no lo ofrece): editar o borrar actividades, proyectos personales, sincronización con Canvas.
