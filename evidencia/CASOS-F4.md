# Casos de prueba · Feature 4: edición, cierre y borrado de actividades y pasos

**Endpoints:** `PATCH /api/activities/:id`, `DELETE /api/activities/:id`, `POST /api/activities/:id/steps`, `PATCH /api/activities/:id/steps/:stepId`, `DELETE /api/activities/:id/steps/:stepId`.

**Reglas** (`src/domain/status.ts` y `src/validators/schemas.ts`):

- **R1** `checkEditable`: una actividad cerrada (`entregada` o `cancelada`) no acepta cambios en sus datos ni en sus pasos. Solo se puede marcar o desmarcar un paso, o borrarla.
- **R2** `checkClose`: `cancelada` se permite siempre que la actividad esté abierta. `entregada` solo se permite si no quedan pasos pendientes (o si no tiene pasos).
- **R3** `statusAfterStepEdit`: al agregar o quitar pasos el estado se recalcula. Sin pasos, vuelve a `pendiente`. Agregar un paso a una actividad `lista` la regresa a `en_curso`.
- **R4** `checkAddStep`: una actividad admite como máximo 50 pasos (`MAX_STEPS`).
- **R5** Validación del body con zod: al menos un campo, tipos y límites (`text` de 1 a 300 caracteres, `estimateMin` entero de 1 a 480, `dueAt` como texto ISO, número o `null`).

**Cómo correrlas:** `npx jest --runInBand --verbose tests/domain/status-edit.test.ts tests/api/edit-delete.test.ts`. La salida está en `evidencia/jest-f4.txt`.

**Totales:** 48 casos, 10 Happy Path (HP), 19 Error Cases (ER) y 19 Edge Cases (ED). Todos están en verde. Una fila corresponde a una prueba, y el ID está al inicio del nombre de la prueba.

Archivos: **D** = `tests/domain/status-edit.test.ts` (reglas puras, sin base de datos) y **A** = `tests/api/edit-delete.test.ts` (endpoints con supertest y MongoDB).

| ID | Tipo | Descripción | Entrada / precondición | Resultado esperado | Archivo y nombre de la prueba | Resultado |
|---|---|---|---|---|---|---|
| HP-01 | Happy Path | Una actividad abierta se puede editar (R1) | `checkEditable` con `pendiente`, `en_curso` y `lista` | `{ ok: true }` en los tres | D · checkEditable › HP-01: abierta se puede editar | OK |
| ER-01 | Error | Una actividad cerrada no se puede editar (R1) | `checkEditable("entregada")` y `checkEditable("cancelada")` | `{ ok: false, message: "La actividad está cerrada y no se puede modificar" }` | D · checkEditable › ER-01: entregada o cancelada no | OK |
| ED-01 | Edge | Cancelar con pasos pendientes (R2) | `checkClose("en_curso", "cancelada", [pendiente, hecho])` | `{ ok: true }` | D · checkClose › ED-01: cancelar una abierta siempre se permite, aunque tenga pasos pendientes | OK |
| ED-02 | Edge | Entregar sin pasos (R2) | `checkClose("pendiente", "entregada", [])` | `{ ok: true }` | D · checkClose › ED-02: entregar sin pasos se permite | OK |
| HP-02 | Happy Path | Entregar con todos los pasos hechos (R2) | `checkClose("lista", "entregada", [hecho, hecho])` | `{ ok: true }` | D · checkClose › HP-02: entregar con todos los pasos hechos se permite | OK |
| ER-02 | Error | Entregar con 1 paso pendiente (R2) | `checkClose("en_curso", "entregada", [hecho, pendiente])` | `ok: false`, «Faltan 1 paso(s) por completar» | D · checkClose › ER-02: entregar con 1 paso pendiente → dice cuántos faltan | OK |
| ER-03 | Error | Entregar con varios pendientes (R2) | 3 pasos pendientes | `ok: false`, «Faltan 3 paso(s) por completar» | D · checkClose › ER-03: entregar con varios pendientes cuenta todos | OK |
| ER-04 | Error | Volver a cerrar una actividad cerrada (R1, R2) | `entregada → cancelada` y `cancelada → entregada` | Mensaje de actividad cerrada | D · checkClose › ER-04: una actividad ya cerrada no se vuelve a cerrar | OK |
| ED-03 | Edge | Agregar pasos hasta el máximo (R4) | `checkAddStep` con 0 y con 49 pasos | `{ ok: true }`, así que el paso 50 sí entra | D · checkAddStep › ED-03: permite agregar hasta llegar al máximo (el paso 50 sí) | OK |
| ED-04 | Edge | El paso 51 (R4) | `checkAddStep("en_curso", 50)` | `ok: false`, «Una actividad admite máximo 50 pasos» | D · checkAddStep › ED-04: el paso 51 se rechaza | OK |
| ER-05 | Error | Agregar un paso a una actividad cerrada (R1, R4) | `checkAddStep("entregada", 1)` | Mensaje de actividad cerrada | D · checkAddStep › ER-05: cerrada se rechaza aunque tenga espacio | OK |
| ED-05 | Edge | Quitar todos los pasos (R3) | `statusAfterStepEdit` con `en_curso` y `lista`, sin pasos | `pendiente` | D · statusAfterStepEdit › ED-05: sin pasos vuelve a pendiente | OK |
| ED-06 | Edge | Agregar un paso a una actividad `lista` (R3) | `lista` con [hecho, pendiente] | `en_curso` | D · statusAfterStepEdit › ED-06: agregar un paso a una actividad lista la regresa a en_curso | OK |
| HP-03 | Happy Path | Los pasos restantes ya están hechos (R3) | `en_curso` con [hecho] | `lista` | D · statusAfterStepEdit › HP-03: si los pasos restantes están todos hechos pasa a lista | OK |
| HP-04 | Happy Path | Un paso pendiente conserva el estado (R3) | `pendiente` con [pendiente] | `pendiente` | D · statusAfterStepEdit › HP-04: con un solo paso pendiente se queda como estaba | OK |
| ED-07 | Edge | Editar los pasos de una actividad cerrada no la reabre (R3) | `entregada` sin pasos y `cancelada` con un pendiente | Conserva su estado | D · statusAfterStepEdit › ED-07: nunca cambia una actividad cerrada | OK |
| HP-05 | Happy Path | Editar datos de la actividad | `PATCH` con `title`, `course`, `brief` y `dueAt` a 5 h | 200, campos nuevos y `urgency: "critica"` | A · PATCH /api/activities/:id › HP-05: cambia título, materia, descripción y fecha (200) y recalcula la urgencia | OK |
| ED-08 | Edge | `null` quita valores sin volverse 1970 (R5) | `PATCH { dueAt: null, course: null, brief: null }` | 200, los tres en `null` y `urgency: "sin_fecha"` | A · PATCH /api/activities/:id › ED-08: null quita la fecha, la materia y la descripción (no se vuelve 1970) | OK |
| ED-09 | Edge | Cambiar `dueAt` cambia el orden del listado | Dos actividades; a la de 100 h se le pone 1 h y luego `null` | El orden de `GET /api/activities` cambia cada vez | A · PATCH /api/activities/:id › ED-09: al cambiar la fecha se actualiza el orden (dueSort) | OK |
| ER-06 | Error | Body vacío o con tipos malos (R5) | `{}`, solo campos desconocidos, `title: ""`, `title: 5`, `dueAt` inválida, `status: "lista"` | 400 «Datos inválidos» en cada uno | A · PATCH /api/activities/:id › ER-06: body vacío, solo campos desconocidos o tipos malos → 400 | OK |
| ER-07 | Error | `dueAt` booleano o arreglo (**defecto corregido**) | `dueAt: true`, `false`, `["2026-12-01"]` | 400 y la fecha guardada no cambia | A · PATCH /api/activities/:id › ER-07: dueAt booleano o arreglo → 400 (antes se guardaba como 1970) | OK |
| ER-08 | Error | Sin token | `PATCH` sin `Authorization` | 401 | A · PATCH /api/activities/:id › ER-08: sin token → 401 | OK |
| ER-09 | Error | Actividad ajena, inexistente o con id mal formado | Token de otro usuario, id inexistente, `no-es-id` | 404 en los tres | A · PATCH /api/activities/:id › ER-09: ajena o inexistente → 404 | OK |
| ER-10 | Error | Entregar con pasos pendientes (R2) | 1 de 2 pasos hecho y `{ status: "entregada" }` | 409 `{ error: { message: "Faltan 1 paso(s) por completar" } }` | A · PATCH /api/activities/:id › ER-10: entregar con pasos pendientes → 409 con cuántos faltan | OK |
| HP-06 | Happy Path | Entregar con todo hecho; después queda cerrada (R1, R2) | Marcar todos los pasos y entregar; luego editar y cancelar | 200 `entregada`; después 409 «La actividad está cerrada…» | A · PATCH /api/activities/:id › HP-06: entregar con todos los pasos hechos (200) y luego editarla → 409 cerrada | OK |
| ED-10 | Edge | Cancelar con pasos pendientes (R2) | 2 pasos pendientes y `{ status: "cancelada" }` | 200 `cancelada` | A · PATCH /api/activities/:id › ED-10: cancelar se permite aunque tenga pasos pendientes | OK |
| ED-11 | Edge | Entregar sin pasos por la API (R2) | Actividad con `steps: []` y `{ status: "entregada" }` | 200, `entregada` y progreso 0/0 | A · PATCH /api/activities/:id › ED-11: entregar una actividad sin pasos → 200 | OK |
| ED-12 | Edge | Un cambio rechazado no guarda nada | `{ title, status: "entregada" }` con 2 pasos pendientes | 409; el `GET` conserva el título y `pendiente` | A · PATCH /api/activities/:id › ED-12: título + entregar con pasos pendientes → 409 y no se guarda ningún cambio | OK |
| HP-07 | Happy Path | Borrar la actividad (persistencia) | `DELETE` de una actividad propia | 204 sin cuerpo; el `GET` da 404 y la colección tiene 0 documentos | A · DELETE /api/activities/:id › HP-07: borra (204 sin cuerpo) y después el GET da 404 | OK |
| ED-13 | Edge | Borrar una actividad cerrada (R1) | Actividad `cancelada` | 204 | A · DELETE /api/activities/:id › ED-13: se puede borrar una actividad cerrada | OK |
| ER-11 | Error | Borrar una ajena, inexistente o sin token | Token de otro usuario, id inexistente, sin token | 404, 404 y 401; la ajena sigue existiendo | A · DELETE /api/activities/:id › ER-11: ajena o inexistente → 404 (y la ajena sigue existiendo); sin token → 401 | OK |
| HP-08 | Happy Path | Agregar un paso (R3) | Actividad `lista` con 1 paso hecho; `POST { text, estimateMin: 25 }` | 201, `en_curso`, `remainingMin` 25 y progreso 1/2 | A · POST /api/activities/:id/steps › HP-08: agrega un paso (201); a una actividad lista la regresa a en_curso | OK |
| ED-14 | Edge | Paso sin `estimateMin` | `POST { text: "Leer" }` | 201 con `estimateMin: 15` | A · POST /api/activities/:id/steps › ED-14: sin estimateMin usa 15 minutos | OK |
| ER-12 | Error | Paso sin texto o con minutos fuera de rango (R5) | `{}`, `text: ""`, `estimateMin` 0 y 481 | 400 en cada uno | A · POST /api/activities/:id/steps › ER-12: texto vacío o minutos fuera de rango → 400 | OK |
| ER-13 | Error | Agregar a una cerrada, a una ajena o sin token (R1) | Token de otro usuario, sin token, actividad cancelada | 404, 401 y 409 «La actividad está cerrada…» | A · POST /api/activities/:id/steps › ER-13: cerrada → 409; ajena → 404; sin token → 401 | OK |
| ER-14 | Error | El paso 51 (R4) | Actividad con 50 pasos y `POST` de uno más | 409 «Una actividad admite máximo 50 pasos» | A · POST /api/activities/:id/steps › ER-14: el paso 51 → 409 | OK |
| ED-15 | Edge | El paso 50 sí entra (R4) | Actividad con 49 pasos y `POST` de uno más | 201 y progreso 0/50 | A · POST /api/activities/:id/steps › ED-15: con 49 pasos, el paso 50 sí se agrega (201) | OK |
| ED-16 | Edge | Límites al agregar (R5) | `text` de 300 y de 301; `estimateMin` 1 y 480 | 201, 400, 201 y 201 | A · POST /api/activities/:id/steps › ED-16: límites al agregar: texto de 300 y minutos 1 y 480 sí; texto de 301 no | OK |
| ER-15 | Error | Texto vacío tras recortar o minutos no enteros (R5) | `text: "   "`, `estimateMin` 1.5 y `"10"` | 400 en cada uno | A · POST /api/activities/:id/steps › ER-15: texto de solo espacios o minutos con decimales → 400 | OK |
| HP-09 | Happy Path | Editar texto y minutos de un paso | `PATCH` de paso con `{ text, estimateMin: 45 }` | 200, `done` sin cambio y `remainingMin` 55 | A · PATCH /api/activities/:id/steps/:stepId (ampliado) › HP-09: edita texto y minutos (200) sin tocar done | OK |
| ER-16 | Error | Body inválido al editar un paso (R5) | `done: "si"`, `{}` y `text: ""` (y `done: true` como control) | 400 en los inválidos y 200 en el control | A · PATCH /api/activities/:id/steps/:stepId (ampliado) › ER-16: sigue aceptando { done: true } y rechazando { done: 'si' } o body vacío | OK |
| ED-17 | Edge | Marcar un paso en una actividad cerrada (R1) | Actividad cancelada; `text`, `estimateMin` y `done: true` | 409, 409 y 200; sigue `cancelada` | A · PATCH /api/activities/:id/steps/:stepId (ampliado) › ED-17: con la actividad cerrada: editar texto → 409, pero marcar/desmarcar sigue funcionando | OK |
| ER-17 | Error | Paso inexistente o de otra actividad | `stepId` inexistente o de otra actividad propia | 404 `{ error: { message: "Paso no encontrado" } }` | A · PATCH /api/activities/:id/steps/:stepId (ampliado) › ER-17: paso inexistente o de otra actividad → 404 «Paso no encontrado» | OK |
| ED-18 | Edge | Límites al editar un paso (R5) | `text` de 300 y 301; `estimateMin` 1, 480, 0 y 481 | 200, 400, 200, 200, 400 y 400 | A · PATCH /api/activities/:id/steps/:stepId (ampliado) › ED-18: límites al editar un paso: texto 300 y minutos 1/480 sí; 301, 0 y 481 no | OK |
| HP-10 | Happy Path | Quitar un paso (R3) | 1 paso hecho y se borra el pendiente | 200, `lista` y progreso 1/1 | A · DELETE /api/activities/:id/steps/:stepId › HP-10: quita el paso (200) y recalcula: si los restantes están hechos pasa a lista | OK |
| ED-19 | Edge | Quitar el último paso (R3) | Único paso hecho y se borra | 200, `pendiente`, `steps: []` y `remainingMin` 0 | A · DELETE /api/activities/:id/steps/:stepId › ED-19: si ya no quedan pasos vuelve a pendiente | OK |
| ER-18 | Error | Quitar un paso inexistente, de una ajena, de una cerrada o sin token (R1) | `stepId` inexistente, token ajeno, sin token, actividad cancelada | 404, 404, 401 y 409 | A · DELETE /api/activities/:id/steps/:stepId › ER-18: paso inexistente → 404; ajena → 404; cerrada → 409; sin token → 401 | OK |
| ER-19 | Error | `:id` o `:stepId` mal formado en las rutas de la feature | `no-es-id` en las cinco rutas, como `:id` o como `:stepId` | 404 en JSON con `error.message`, nunca 500 | A · ids mal formados en las rutas de la feature › ER-19: :id o :stepId que no es ObjectId → 404 en JSON (nunca 500) | OK |

## Defecto encontrado al escribir los casos

- **Qué fallaba:** `PATCH /api/activities/:id` (y también `POST /api/activities`) aceptaba `dueAt: true`, `false` o `["2026-12-01"]` con 200/201. `true` se guardaba como `1970-01-01T00:00:00.001Z`.
- **Causa:** `z.coerce.date()` aplica `new Date(valor)` a cualquier tipo. `new Date(true)` es 1 ms después de 1970 y `new Date(["2026-12-01"])` convierte el arreglo a texto.
- **Arreglo:** en `src/validators/schemas.ts`, `dueAt` acepta solo texto o número antes de convertir (`dateInput`). `null` sigue quitando la fecha. El contrato no cambia: es un 400 más para entradas que ya eran inválidas.
- **Prueba que lo cubre:** ER-07 en la API de la feature, más «dueAt booleano o arreglo → 400» en `tests/api/activities.test.ts`. Las dos fallan si se revierte el arreglo.
