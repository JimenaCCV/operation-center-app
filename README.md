# Centro de Operaciones AI

Backend (Node.js + Express + TypeScript + MongoDB/Mongoose) para organizar actividades escolares: cada actividad tiene pasos con tiempo estimado, y la API arma un plan de sesión según los minutos que tengas disponibles.

Proyecto integrador del curso *Tecnologías de desarrollo en el servidor* (ITESO). Este repositorio contiene el Entregable 1 (features 1–3) y el Entregable 2 (features 4–6), además de un front web sencillo en [`web/`](web/README.md).

## Problema y usuarios

Estudiantes con varias entregas a la vez suelen saber *qué* tienen pendiente, pero no *por dónde empezar* ni *cuánto cabe* en el tiempo que tienen hoy. La API guarda las actividades de cada persona con sus pasos, calcula su urgencia por fecha de entrega y propone qué hacer en una sesión de N minutos.

- **Usuario**: estudiante registrado; solo ve y modifica sus propias actividades.
- **Administrador**: puede consultar la lista de usuarios (base para auditoría en entregas posteriores).

## Features

| # | Entrega | Feature | Qué hace |
|---|---------|---------|----------|
| 1 | 1 | Autenticación y roles | Registro, login con JWT, ruta protegida por rol (`admin`). |
| 2 | 1 | Actividades con pasos | Crear una actividad con pasos, consultarla y marcar pasos como hechos (el estado se deriva solo). |
| 3 | 1 | Listar y planear pendientes | Listar con filtros (materia, estado, urgencia) y paginación; plan de sesión para N minutos. |
| 4 | 2 | Edición y borrado | Editar los datos de una actividad, cerrarla a mano (entregada o cancelada), borrarla; agregar, editar y quitar pasos. Una actividad cerrada ya no se modifica. |
| 5 | 2 | Resumen de carga | Cuántas actividades hay por estado y urgencia, pasos y minutos pendientes, y la próxima entrega. |
| 6 | 2 | Límite de intentos | Login y registro bloquean por IP tras demasiados intentos (429 con `Retry-After`). En login solo cuentan los fallidos. |

## Requisitos

- Node.js 20 o superior
- MongoDB 6/7 corriendo (local con Docker, o un cluster de MongoDB Atlas)

## Instalación y ejecución

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno (copia el ejemplo y cambia JWT_SECRET)
cp .env.example .env

# 3. Base de datos local (opcional si usas Atlas)
docker compose up -d

# 4. Servidor en modo desarrollo -> http://localhost:3000/api
npm run dev
```

Comprueba que responde:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

Con el servidor corriendo, en otra terminal puedes recorrer las features con requests reales:

```bash
npm run demo     # Entregable 1: features 1–3

# Entregable 2: features 4–6. Arranca el servidor con un límite bajo para que el bloque del 429 no tarde:
#   RATE_LIMIT_MAX=5 npm run dev
npm run demo2
```

La salida de `demo2` de referencia está en [`evidencia/demo2-salida.txt`](evidencia/demo2-salida.txt).

### Variables de entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto HTTP | `3000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB | `mongodb://127.0.0.1:27017/op-jccv` |
| `JWT_SECRET` | Secreto para firmar tokens (≥ 16 caracteres) | *(obligatoria)* |
| `JWT_EXPIRES_IN` | Vigencia del token | `1h` |
| `BCRYPT_ROUNDS` | Costo de bcrypt | `10` |
| `RATE_LIMIT_MAX` | Intentos permitidos por IP y ventana en login (solo fallidos) y registro | `10` |
| `RATE_LIMIT_WINDOW_MIN` | Duración de la ventana del límite, en minutos | `15` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Solo para `npm run seed` | — |

Con `NODE_ENV=test` (las pruebas) el límite de intentos de la app está desactivado.

### Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta |
| `npm test` | Pruebas (vitest). Las de API necesitan MongoDB; usan la base `op-jccv-test` o `MONGODB_TEST_URI` |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run seed` | Crea un administrador con `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `npm run demo` | Recorre las features 1–3 con `curl` |
| `npm run demo2` | Recorre las features 4–6 con `curl` (servidor con `RATE_LIMIT_MAX=5`) |

## Estructura

```text
src/
  app.ts, server.ts       Express (createApp) y arranque
  config/                 env (validación con zod) y conexión a MongoDB
  routes/                 Qué URL y método -> qué controlador y middlewares
  controllers/            Traducen HTTP <-> servicios (sin lógica de negocio)
  services/               Casos de uso: autenticar, crear, editar, borrar, listar, planear, resumir
  models/                 Esquemas Mongoose (User, Activity con pasos embebidos)
  domain/
    status.ts             Estados, cierre (checkClose), edición de pasos (statusAfterStepEdit), máximo de pasos
    urgency.ts            Urgencia por fecha de entrega
    planner.ts            Planificador de sesión
    summary.ts            Resumen de carga (summarize)
  middleware/
    auth.middleware.ts    authenticate, requireRole
    validate.middleware.ts  Validación de body y query con zod
    rate-limit.middleware.ts  Límite de intentos (createAuthLimiter, express-rate-limit)
    error.middleware.ts   Respuesta de error uniforme
  validators/             Esquemas zod de body y query
  scripts/seed.ts         Crea un administrador
tests/
  domain/                 Pruebas de reglas puras (sin base de datos)
  api/                    Pruebas de endpoints con supertest
  middleware/             Límite de intentos con una mini app (sin base de datos)
scripts/demo.sh           Demostración con curl (Entregable 1)
scripts/demo2.sh          Demostración con curl (Entregable 2)
evidencia/                Salida de demo2 (evidencia del Entregable 2)
web/                      Front web (React + Vite), ver web/README.md
```

Flujo de una petición: `Route -> middleware (authenticate / validate) -> Controller -> Service -> Model -> MongoDB`. Los errores llegan a un único middleware que responde `{ "error": { "message", "details?" } }`.

## API

Todas las rutas cuelgan de `/api`. Las marcadas con 🔒 requieren `Authorization: Bearer <token>`.

15 endpoints: 10 del Entregable 1, 5 nuevos del Entregable 2 (★) y 1 ampliado (☆).

| Método | Endpoint | Propósito | HTTP |
|--------|----------|-----------|------|
| GET | `/api/health` | Comprobar que el servidor responde | 200 |
| POST | `/api/auth/register` | Crear cuenta (con límite de intentos) | 201, 400, 409, 429 |
| POST | `/api/auth/login` | Iniciar sesión y recibir JWT (con límite de intentos fallidos) | 200, 400, 401, 429 |
| GET | `/api/auth/me` 🔒 | Datos de la cuenta autenticada | 200, 401 |
| GET | `/api/users` 🔒 admin | Listar usuarios | 200, 401, 403 |
| POST | `/api/activities` 🔒 | Crear actividad con pasos | 201, 400, 401 |
| GET | `/api/activities/:id` 🔒 | Consultar una actividad propia | 200, 401, 404 |
| PATCH ★ | `/api/activities/:id` 🔒 | Editar `title`, `course`, `brief`, `dueAt` (`null` los quita) o cerrar con `status: "entregada" \| "cancelada"` | 200, 400, 401, 404, 409 |
| DELETE ★ | `/api/activities/:id` 🔒 | Borrar una actividad (en cualquier estado) | 204, 401, 404 |
| POST ★ | `/api/activities/:id/steps` 🔒 | Agregar un paso `{ text, estimateMin? }` | 201, 400, 401, 404, 409 |
| PATCH ☆ | `/api/activities/:id/steps/:stepId` 🔒 | Marcar/desmarcar (`done`) y, ahora también, editar `text` y `estimateMin` | 200, 400, 401, 404, 409 |
| DELETE ★ | `/api/activities/:id/steps/:stepId` 🔒 | Quitar un paso | 200, 401, 404, 409 |
| GET | `/api/activities` 🔒 | Listar con filtros `course`, `status`, `urgency`, `limit`, `offset` | 200, 400, 401 |
| GET | `/api/plan?minutes=N` 🔒 | Plan de sesión para N minutos | 200, 400, 401 |
| GET ★ | `/api/summary` 🔒 | Resumen de carga del usuario | 200, 401 |

Una actividad ajena o inexistente siempre responde 404. Un body vacío o solo con campos desconocidos en los PATCH responde 400.

### Ejemplo: entregar con pasos pendientes

```bash
curl -X PATCH "http://localhost:3000/api/activities/$ID" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"entregada"}'
# HTTP 409
# { "error": { "message": "Faltan 3 paso(s) por completar" } }
```

### Ejemplo: resumen de carga

```bash
curl 'http://localhost:3000/api/summary' -H "Authorization: Bearer $TOKEN"
```

```json
{
  "total": 2,
  "open": 1,
  "byStatus": { "pendiente": 1, "en_curso": 0, "lista": 0, "entregada": 1, "cancelada": 0 },
  "byUrgency": { "vencida": 0, "critica": 0, "pronto": 1, "holgada": 0, "sin_fecha": 0 },
  "pendingSteps": 2,
  "remainingMin": 45,
  "nextDue": { "id": "6af250ca3ecf46ebde7b36c7", "title": "Lectura de Bioética", "dueAt": "2026-11-11T23:01:30.821Z", "urgency": "pronto" }
}
```

### Ejemplo: plan de 25 minutos

```bash
curl 'http://localhost:3000/api/plan?minutes=25' -H "Authorization: Bearer $TOKEN"
```

```json
{
  "minutes": 25,
  "steps": [
    {
      "activityId": "6ad174ef2d7495e7f9e7fb26",
      "activityTitle": "Entregable 1",
      "stepId": "6ad174ef2d7495e7f9e7fb28",
      "text": "Escribir README",
      "estimateMin": 20,
      "startsAtMin": 0
    }
  ],
  "totalMin": 20,
  "remaining": 1
}
```

## Reglas de dominio

- **Urgencia** (por fecha de entrega): `vencida` (ya pasó), `critica` (< 24 h), `pronto` (< 72 h), `holgada`, `sin_fecha`.
- **Estado** (se deriva de los pasos): todos hechos -> `lista`; algunos -> `en_curso`. Una actividad `entregada` o `cancelada` nunca se reabre.
- **Plan de sesión**: ordena por fecha de entrega (sin fecha, al final), respeta el orden de los pasos de cada actividad y llena el tiempo con pasos de otras actividades cuando el siguiente no cabe. Siempre incluye al menos un paso.

Entregable 2 (`src/domain/status.ts` y `src/domain/summary.ts`, funciones puras probadas con vitest):

- **Actividad cerrada** (`entregada` o `cancelada`): no se editan sus datos ni se agregan, editan o quitan pasos (409 «La actividad está cerrada y no se puede modificar»). Sí se puede marcar o desmarcar un paso y borrar la actividad entera.
- **Cerrar a mano** (`checkClose`): `cancelada` siempre que esté abierta; `entregada` solo si no quedan pasos pendientes (o no tiene pasos). Si no, 409 «Faltan N paso(s) por completar».
- **Estado al agregar o quitar pasos** (`statusAfterStepEdit`): sin pasos vuelve a `pendiente`; si no, se deriva de los pasos (agregar un paso a una actividad `lista` la regresa a `en_curso`; si los que quedan están todos hechos, pasa a `lista`).
- **Máximo 50 pasos** por actividad: el 51.º responde 409.
- **Resumen** (`summarize`): `byStatus` cuenta todas las actividades; `byUrgency`, `pendingSteps` y `remainingMin`, solo las abiertas. `nextDue` es la abierta con la fecha futura más cercana; las vencidas y las que no tienen fecha no cuentan.

## Seguridad

- Contraseñas con bcrypt; el hash nunca sale en las respuestas.
- JWT firmado con `JWT_SECRET`; roles `user` y `admin`. El registro público siempre crea usuarios normales.
- Cada consulta de actividades filtra por dueño: la actividad de otra persona responde 404.
- Entradas validadas con zod; `.env` está en `.gitignore`.
- Límite de intentos por IP en login (solo fallidos) y registro con `express-rate-limit`: 429 con `Retry-After`. El contador vive en memoria del proceso: se reinicia al reiniciar el servidor y no se comparte entre varias instancias.

## Front

En [`web/`](web/README.md) hay una interfaz React + Vite + TypeScript que usa esta API: login y registro, bandeja con resumen de carga y planificador, crear, editar, cerrar y borrar actividades y sus pasos, y la lista de usuarios para administradores. Corre en el puerto 5173 y reenvía `/api` al back en el 3000.

## Origen

La lógica de dominio (`src/domain/`) está adaptada de OP-JCCV, una aplicación personal de escritorio para organizar tareas de Canvas con ayuda de Claude. Esta API toma la idea central (actividades, pasos, urgencia y planificación) y la expone como un servicio HTTP.
