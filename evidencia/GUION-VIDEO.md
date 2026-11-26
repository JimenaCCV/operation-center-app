# Guion del video · Entregable 4 (de 90 a 150 s)

**Recorrido:** login → `POST /api/activities` con 3 pasos → `PATCH /api/activities/:id` con `{"status":"entregada"}` → **409** → marcar los pasos → el mismo `PATCH` → **200** → `GET /api/summary`.

## Antes de grabar

1. Levanta MongoDB con `docker compose up -d`.
2. En la terminal 1, arranca el servidor con `npm run dev`. Arráncalo de nuevo justo antes de grabar, porque el límite de intentos vive en memoria.
3. Deja la terminal 2 lista con `bash scripts/demo-video.sh`. El script pausa entre pasos: presiona Enter cuando termines de narrar cada uno.
4. Abre en el editor, cada uno en su pestaña: `src/routes/index.ts`, `src/controllers/activity.controller.ts`, `src/services/activity.service.ts` y `src/domain/status.ts`.
5. Usa una letra de terminal y de editor de 18 px o más, para que se lea en YouTube.

## Tramos

| Tiempo | En pantalla | Texto a decir |
|---|---|---|
| 0:00–0:12 | Diapositiva o README con el título «Centro de Operaciones AI» | «Somos Jimena y Emiliano. Este es Centro de Operaciones AI, una API para estudiantes con varias entregas a la vez. Guarda cada actividad con sus pasos y te dice qué hacer en el tiempo que tienes.» |
| 0:12–0:25 | Terminal 2: corre `bash scripts/demo-video.sh`. Se ve `=== 1 · Login`, `→ POST /api/auth/login` y `← HTTP 200` | «Primero, login. Un POST a /api/auth/login devuelve un token JWT. Lo mandamos en cada petición siguiente.» |
| 0:25–0:40 | Enter. Se ve `=== 2 · Crear actividad con 3 pasos`, `→ POST /api/activities`, `← HTTP 201`, `"status": "pendiente"` y `"remainingMin": 90` | «Creamos una actividad con tres pasos: un POST a /api/activities. Responde 201, con estado pendiente y noventa minutos por hacer.» |
| 0:40–0:55 | Enter. Se ve `=== 3`, `→ PATCH /api/activities/<id>`, `body: {"status":"entregada"}` y `← HTTP 409` con «Faltan 3 paso(s) por completar» | «Ahora intentamos entregarla con un PATCH a /api/activities/id. La API responde 409: faltan tres pasos por completar. No se puede entregar con pasos pendientes.» |
| 0:55–1:10 | Editor: `src/routes/index.ts` (líneas 51–56) y luego `src/controllers/activity.controller.ts` (línea 20) | «¿Quién procesa esta petición? La ruta PATCH pasa por dos middlewares: authenticate revisa el token y validate revisa el body con zod. Luego llega al controlador update, que solo traduce HTTP y llama al servicio.» |
| 1:10–1:25 | Editor: `src/domain/status.ts`, función `checkClose` (líneas 61–73, sobre todo la 70) | «La regla de negocio vive en checkClose, una función pura del dominio. Si quieres entregar y quedan pasos pendientes, regresa un rechazo con cuántos faltan.» |
| 1:25–1:40 | Editor: `src/services/activity.service.ts`, `findOwned` (línea 44), `updateActivity` (líneas 92–106) y `enforce` (línea 82) | «El servicio busca la actividad en MongoDB con findOne, filtrando por dueño. Si es de otra persona, da 404. Luego aplica la regla. enforce convierte el rechazo en un 409. Si todo está bien, guarda con save.» |
| 1:40–1:55 | Terminal 2: Enter. Se ven los tres `=== 4 · Marcar paso como hecho` con `← HTTP 200`, y `remainingMin` baja de 50 a 20 a 0 y `status` pasa a `lista` | «Marcamos los tres pasos. El estado se recalcula solo: en curso y luego lista. Los minutos pendientes bajan a cero.» |
| 1:55–2:05 | Enter. Se ve `=== 5`, el mismo `PATCH` y `← HTTP 200` con `"status": "entregada"` | «El mismo PATCH ahora responde 200 y la actividad queda entregada. Ya no se puede editar.» |
| 2:05–2:20 | Enter. Se ve `=== 6 · Resumen de carga`, `→ GET /api/summary`, `← HTTP 200`, `"open": 0` y `byStatus.entregada: 1` | «Por último, GET /api/summary lee de MongoDB y responde con la carga: cero actividades abiertas y una entregada. Esto es lo que ve el cliente. Todas las pruebas están en Jest: ciento veinte, en verde.» |

**Duración estimada:** unos 2:20 (140 s). Si te pasas de 150 s, recorta el tramo 1:40–1:55 (no muestres los tres pasos uno por uno y solo di «marcamos los tres pasos»).

**Qué exige la rúbrica y dónde aparece en el video:**

- Presentación: 0:00
- Método y endpoint a la vista: 0:12, 0:25 y 0:40
- Componente que recibe y procesa (route → middleware → controller → service): 0:55
- Regla de negocio (`checkClose`): 1:10
- Persistencia (`findOne` y `save` en MongoDB): 1:25 y 2:05
- Response al cliente: en cada tramo de terminal
- Demo real: toda la terminal

## Después de grabar

1. Sube el video a YouTube como «No listado» o «Público».
2. En `README.md`, reemplaza la línea `VIDEO_URL_PENDIENTE` por el enlace.
3. Pon el mismo enlace dentro del PDF del reporte.
