# Guion de capturas · Entregable 2

Lista de capturas para el reporte. Cada una indica la pantalla exacta, cómo llegar y qué debe verse. Están en el orden en que conviene tomarlas: **el 429 bloquea tu IP 15 minutos**, por eso va casi al final.

## Antes de empezar

Tres terminales en la raíz del repo:

```bash
# 1. Base de datos
docker compose up -d

# 2. Back con límite bajo (para que el 429 llegue en 5 intentos)
RATE_LIMIT_MAX=5 npm run dev

# 3. Front
cd web && npm run dev        # abre http://localhost:5173
```

Navegador a pantalla completa (o ~1440 px de ancho). Usa una cuenta nueva desde «Registrarme» para que la bandeja solo tenga tus datos de prueba.

**Datos para que el resumen se vea completo** (créalos en «Nueva actividad» antes de la captura 1):

| Título | Materia | Fecha | Pasos (minutos) |
|---|---|---|---|
| Entregable 2 | Tecnologías en el servidor | dentro de 5 días | Leer la rúbrica (15), Programar endpoints (60), Escribir el reporte (40) |
| Lectura capítulo 3 | Bioética | **hoy** (vence a las 23:59, así cuenta como «Menos de 24 h») | Leer (30), Hacer resumen (20) |
| Ensayo final | Inglés | sin fecha | Investigar (45) |

---

## 1. Bandeja con el resumen y el plan de sesión

- **Pantalla:** `/` (botón «Hoy» de la barra superior).
- **Acción:** en «¿Cuánto tiempo tienes hoy?» elige **1 h 30**.
- **Debe verse:** el panel **«Tu carga»** con Abiertas 3, Menos de 24 h 1 (en rojo), Pasos pendientes 6, Tiempo restante y **«Próxima entrega: Lectura capítulo 3»**, junto con el plan con sus pasos («+0′, +30′…»). Si no cabe todo, toma dos capturas: el resumen con el plan, y las tarjetas de abajo.

## 2. Detalle de una actividad antes y después de editar título y fecha

- **Pantalla:** `/actividades/:id` (clic en el título «Entregable 2» de la bandeja).
- **2a · Antes:** el detalle con título «Entregable 2», la píldora «Entrega en 5 d», la línea «Entrega: …» y sus 3 pasos con los botones Editar y ✕.
- **2b · Editando:** clic en **Editar** (panel de abajo). Cambia el título a «Entregable 2 · backend y front» y la fecha a **pasado mañana**. Captura el formulario lleno antes de guardar.
- **2c · Después:** clic en **Guardar cambios**. Debe verse el título nuevo, la píldora con la fecha nueva (por ejemplo «Entrega en 2 d») y la línea «Entrega: …» actualizada.

## 3. Agregar y quitar un paso

- **Pantalla:** el mismo detalle.
- **3a · Agregar:** escribe «Revisar ortografía» con 10 min en «Nuevo paso» y clic en **+ Agregar**. Debe verse el cuarto paso al final de la lista y «Faltan unos …» actualizado.
- **3b · Quitar:** clic en **✕** del paso «Leer la rúbrica». Debe verse la lista ya sin ese paso.
- (Opcional) **3c · Editar paso:** clic en **Editar** de un paso, cambia el texto o los minutos y captura la fila en modo edición.

## 4. Error 409 al marcar como entregada con pasos pendientes

- **Pantalla:** el mismo detalle, con al menos un paso sin marcar.
- **Acción:** clic en **Marcar como entregada**.
- **Debe verse:** debajo de los botones, en rojo, **«Faltan N paso(s) por completar»** (mensaje de la API, 409). La actividad sigue en «Pendiente» o «En curso».

## 5. Actividad entregada con los controles de edición ocultos

- **Pantalla:** el mismo detalle.
- **Acción:** marca todos los pasos (la píldora cambia a «Lista para entregar») y clic en **Marcar como entregada**.
- **Debe verse:** la píldora **«Entregada»**, los pasos tachados, **sin** los botones Editar ni ✕ en los pasos, **sin** el campo «Nuevo paso», y en el panel de abajo solo «Esta actividad está cerrada: ya no se puede editar.» y **Eliminar**.

## 6. Eliminar una actividad y su desaparición de la bandeja

- **Pantalla:** el detalle de la actividad entregada (o de cualquier otra).
- **6a · Confirmación:** clic en **Eliminar**. Debe verse la confirmación en la propia página: «¿Eliminar *título* y todos sus pasos? No se puede deshacer.» con **Sí, eliminar** y **No, conservarla**.
- **6b · Bandeja tras recargar:** clic en **Sí, eliminar** (vuelve a `/`), **recarga la página (Cmd+R)** y captura la bandeja: la actividad ya no aparece y «Tu carga» bajó sus totales. (Esto demuestra la persistencia: el borrado está en MongoDB, no solo en la pantalla.)

## 7. Login con el mensaje de 429

> Después de esta captura tu IP queda bloqueada para login 15 minutos. Para seguir usando la app, reinicia el back (Ctrl+C y `RATE_LIMIT_MAX=5 npm run dev` otra vez).

- **Pantalla:** `/login` (botón **Salir** de la barra superior).
- **Acción:** escribe tu correo con una contraseña incorrecta y clic en **Entrar** seis veces seguidas.
- **Debe verse:** los primeros 5 intentos dicen «Credenciales inválidas»; en el 6.º, en rojo, **«Demasiados intentos. Intenta de nuevo en 15 minuto(s).»**
- (Opcional) Con las herramientas de desarrollador abiertas (pestaña Red / Network), la respuesta `login` con **status 429** y el encabezado **Retry-After**.

## 8. Terminal con `npm test` en verde

- **Pantalla:** una terminal en la raíz del repo (MongoDB corriendo).
- **Acción:** `npm test`
- **Debe verse:** los 10 archivos de prueba con ✓ y al final **`Test Files 10 passed (10)`** y **`Tests 105 passed (105)`**.

## 9. Salida de `scripts/demo2.sh`

- **Pantalla:** una terminal en la raíz del repo, con el back recién reiniciado con `RATE_LIMIT_MAX=5 npm run dev` (si no, el login del inicio sale 429 por la captura 7).
- **Acción:** `npm run demo2`
- **Debe verse:** cada request con su `curl`, su `HTTP …` y su JSON. Las partes importantes para capturar (pueden ser varias capturas):
  - **5:** `HTTP 409` con «Faltan 3 paso(s) por completar».
  - **6:** `HTTP 409` con «La actividad está cerrada y no se puede modificar».
  - **7:** `HTTP 200` del resumen.
  - **8:** `HTTP 204` del DELETE y `HTTP 404` del GET siguiente.
  - **9:** cinco `HTTP 401` y luego **`HTTP 429`** con **`Retry-After`**.
- La salida completa de referencia ya está en `evidencia/demo2-salida.txt`.

---

## Opcionales (si el reporte lo pide o sobra espacio)

- **Teléfono:** en Chrome, herramientas de desarrollador → modo dispositivo → iPhone 12 Pro (390 px). Captura la bandeja y el detalle: no hay scroll horizontal.
- **Modo oscuro:** con el sistema en modo oscuro, la bandeja con «Tu carga».
- **Git:** `git log --oneline feat/entregable-2` para mostrar los commits por tema.
