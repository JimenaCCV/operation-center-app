# Centro de Operaciones AI

Backend (Node.js + Express + TypeScript + MongoDB/Mongoose) para organizar actividades escolares: cada actividad tiene pasos con tiempo estimado, y la API arma un plan de sesión según los minutos que tengas disponibles.

Proyecto integrador del curso *Tecnologías de desarrollo en el servidor* (ITESO). Este repositorio contiene la primera entrega (Entregable 1); crecerá en las siguientes.

## Problema y usuarios

Estudiantes con varias entregas a la vez suelen saber *qué* tienen pendiente, pero no *por dónde empezar* ni *cuánto cabe* en el tiempo que tienen hoy. La API guarda las actividades de cada persona con sus pasos, calcula su urgencia por fecha de entrega y propone qué hacer en una sesión de N minutos.

- **Usuario**: estudiante registrado; solo ve y modifica sus propias actividades.
- **Administrador**: puede consultar la lista de usuarios (base para auditoría en entregas posteriores).

## Features de esta entrega

| # | Feature | Qué hace |
|---|---------|----------|
| 1 | Autenticación y roles | Registro, login con JWT, ruta protegida por rol (`admin`). |
| 2 | Actividades con pasos | Crear una actividad con pasos, consultarla y marcar pasos como hechos (el estado se deriva solo). |
| 3 | Listar y planear pendientes | Listar con filtros (materia, estado, urgencia) y paginación; plan de sesión para N minutos. |

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

Con el servidor corriendo, en otra terminal puedes recorrer las tres features con requests reales:

```bash
npm run demo
```

### Variables de entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto HTTP | `3000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB | `mongodb://127.0.0.1:27017/op-jccv` |
| `JWT_SECRET` | Secreto para firmar tokens (≥ 16 caracteres) | *(obligatoria)* |
| `JWT_EXPIRES_IN` | Vigencia del token | `1h` |
| `BCRYPT_ROUNDS` | Costo de bcrypt | `10` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Solo para `npm run seed` | — |

### Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta |
| `npm test` | Pruebas (vitest). Las de API necesitan MongoDB; usan la base `op-jccv-test` o `MONGODB_TEST_URI` |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run seed` | Crea un administrador con `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `npm run demo` | Recorre las tres features con `curl` |

## Estructura

```text
src/
  app.ts, server.ts       Express (createApp) y arranque
  config/                 env (validación con zod) y conexión a MongoDB
  routes/                 Qué URL y método -> qué controlador y middlewares
  controllers/            Traducen HTTP <-> servicios (sin lógica de negocio)
  services/               Casos de uso: autenticar, crear, listar, planear
  models/                 Esquemas Mongoose (User, Activity con pasos embebidos)
  domain/                 Reglas puras: estados, urgencia, planificador de sesión
  middleware/             authenticate, requireRole, validate (zod), manejo de errores
  validators/             Esquemas zod de body y query
  scripts/seed.ts         Crea un administrador
tests/
  domain/                 Pruebas de reglas puras (sin base de datos)
  api/                    Pruebas de endpoints con supertest
scripts/demo.sh           Demostración con curl
```

Flujo de una petición: `Route -> middleware (authenticate / validate) -> Controller -> Service -> Model -> MongoDB`. Los errores llegan a un único middleware que responde `{ "error": { "message", "details?" } }`.

## API

Todas las rutas cuelgan de `/api`. Las marcadas con 🔒 requieren `Authorization: Bearer <token>`.

| Método | Endpoint | Propósito | HTTP |
|--------|----------|-----------|------|
| GET | `/api/health` | Comprobar que el servidor responde | 200 |
| POST | `/api/auth/register` | Crear cuenta | 201, 400, 409 |
| POST | `/api/auth/login` | Iniciar sesión y recibir JWT | 200, 400, 401 |
| GET | `/api/auth/me` 🔒 | Datos de la cuenta autenticada | 200, 401 |
| GET | `/api/users` 🔒 admin | Listar usuarios | 200, 401, 403 |
| POST | `/api/activities` 🔒 | Crear actividad con pasos | 201, 400, 401 |
| GET | `/api/activities/:id` 🔒 | Consultar una actividad propia | 200, 401, 404 |
| PATCH | `/api/activities/:id/steps/:stepId` 🔒 | Marcar/desmarcar un paso | 200, 400, 401, 404 |
| GET | `/api/activities` 🔒 | Listar con filtros `course`, `status`, `urgency`, `limit`, `offset` | 200, 400, 401 |
| GET | `/api/plan?minutes=N` 🔒 | Plan de sesión para N minutos | 200, 400, 401 |

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

## Seguridad

- Contraseñas con bcrypt; el hash nunca sale en las respuestas.
- JWT firmado con `JWT_SECRET`; roles `user` y `admin`. El registro público siempre crea usuarios normales.
- Cada consulta de actividades filtra por dueño: la actividad de otra persona responde 404.
- Entradas validadas con zod; `.env` está en `.gitignore`.

## Origen

La lógica de dominio (`src/domain/`) está adaptada de OP-JCCV, una aplicación personal de escritorio para organizar tareas de Canvas con ayuda de Claude. Esta API toma la idea central (actividades, pasos, urgencia y planificación) y la expone como un servicio HTTP.
