# Guion de capturas · Entregable 4

**Preparación:**

- `docker compose up -d`
- En la terminal 1: `RATE_LIMIT_MAX=5 npm run dev`
- En la terminal 2, el front: `cd web && npm run dev`, que abre http://localhost:5173
- Toma las capturas de navegador a 1440 px de ancho. Toma una más a 390 px (en DevTools, modo dispositivo) en la captura 4.

| # | Pantalla | Qué hacer | Qué debe verse |
|---|---|---|---|
| 1 | Terminal | En la raíz del repo, corre `npm run build` | El comando `tsc -p tsconfig.build.json` sin errores y el prompt de regreso |
| 2 | Terminal | Corre `npm test` | `Test Suites: 11 passed, 11 total` y `Tests: 120 passed, 120 total`, con la palabra Jest visible (por ejemplo `> jest --runInBand`) |
| 3 | Navegador, `/` (bandeja) | Entra con una cuenta que tenga al menos 2 actividades abiertas | El panel «Tu carga» con sus números y el planificador con un plan (por ejemplo de 45 min) |
| 4 | Navegador, `/actividades/:id` | Abre una actividad con 3 pasos y marca 1 | Los pasos con su checklist, el progreso 1/3 y los minutos restantes. Repite a 390 px: sin scroll horizontal |
| 5 | Navegador, mismo detalle | Con pasos pendientes, presiona «Marcar como entregada» | El mensaje de error del 409: «Faltan 2 paso(s) por completar» |
| 6 | Navegador, mismo detalle | Marca todos los pasos y presiona «Marcar como entregada» | Estado «entregada» y el texto «Esta actividad está cerrada: ya no se puede editar.». No aparecen Editar, Cancelar ni los controles de pasos; solo queda «Eliminar» |
| 7 | Navegador | Elimina la actividad, confirma, recarga la página y abre su URL vieja | La bandeja sin la actividad y, en la URL vieja, el mensaje «Esa actividad no existe.» (la API respondió 404). Esto muestra la persistencia |
| 8 | Navegador, `/login` | Cierra sesión y entra 6 veces con una contraseña incorrecta | El mensaje del 429: «Demasiados intentos. Intenta de nuevo en N minuto(s).» |
| 9 | Terminal | Reinicia el servidor (`RATE_LIMIT_MAX=5 npm run dev`) y corre `npm run demo2` | El final de la salida: los bloques 8 (204 y luego 404) y 9 (401 ×5 y 429 con `Retry-After`) |
| 10 | Editor o terminal | Abre `evidencia/CASOS-F4.md` o corre `npx jest --runInBand --verbose tests/domain/status-edit.test.ts tests/api/edit-delete.test.ts` | La tabla con los IDs HP/ER/ED, o la lista de pruebas con `✓ HP-…`, `✓ ER-…`, `✓ ED-…` y `Tests: 48 passed` |
