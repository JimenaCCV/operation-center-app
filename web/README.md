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
| `/login` | Entrar o registrarse. Si la API responde 429 (demasiados intentos) se muestra su mensaje; no se reintenta solo | `POST /auth/login`, `POST /auth/register` |
| `/` | Franja del día, panel «Tu carga» (abiertas, vencidas, menos de 24 h, pasos pendientes, tiempo restante y próxima entrega con enlace), planificador (20 min, 45 min, 1 h 30, todo) y actividades con filtros (materia, estado, urgencia) y paginación | `GET /summary`, `GET /plan`, `GET /activities` |
| `/actividades/nueva` | Crear una actividad con sus pasos y minutos estimados | `POST /activities` |
| `/actividades/:id` | Detalle: marcar y desmarcar pasos; agregar, editar (texto y minutos) y quitar pasos; editar título, materia, descripción y fecha; marcar como entregada; cancelar; eliminar | `GET /activities/:id`, `PATCH /activities/:id`, `DELETE /activities/:id`, `POST /activities/:id/steps`, `PATCH /activities/:id/steps/:stepId`, `DELETE /activities/:id/steps/:stepId` |
| `/admin` | Lista de usuarios (solo `admin`) | `GET /users` |

## Decisiones

- **Sesión:** el JWT se guarda en `localStorage`. Cuando la API responde 401 con un token guardado (vencido, 1 h por defecto), la app cierra la sesión y manda al login.
- **Rutas protegidas:** `RequireAuth` y `RequireAdmin` en `src/App.tsx`. El back sigue siendo quien decide los permisos; el front solo oculta lo que no corresponde.
- **Estado:** sin librerías; `useState`/`useEffect` y un contexto para la sesión. Cada tarjeta actualiza con la actividad que devuelve la API.
- **Marcar un paso** se refleja al instante y se revierte si la API falla.
- **Horario de disponibilidad:** el back no lo guarda, así que se recuerda en el navegador (`localStorage`).
- **Fechas de entrega:** el formulario manda las 23:59 hora de México (UTC−6). Al editar, la fecha solo se envía si cambió, así que una fecha sin tocar conserva su hora original; dejarla vacía quita la fecha.
- **Editar solo lo que cambió:** el formulario de edición manda a `PATCH /activities/:id` únicamente los campos modificados.
- **Actividad cerrada** (entregada o cancelada): se ocultan Editar, Marcar como entregada, Cancelar y los controles de pasos; queda solo Eliminar.
- **Confirmaciones en la página** (sin `window.confirm`) para eliminar y para cancelar, porque las dos son irreversibles. Al eliminar se vuelve a `/`.
- **Errores de la API** (por ejemplo el 409 «Faltan N paso(s) por completar») se muestran con el mensaje que devuelve el back.
- **Resumen y plan** se vuelven a pedir cada vez que cambia un paso en la bandeja.
- **Teléfono:** a 390 px no hay scroll horizontal; en el detalle, los botones de cada paso bajan debajo del texto.
- **Fuera de alcance por ahora:** proyectos personales, sincronización con Canvas.
