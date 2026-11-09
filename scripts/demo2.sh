#!/usr/bin/env bash
# Entregable 2: recorre las features 4, 5 y 6 con requests reales (curl) y muestra cada respuesta con su status HTTP.
# Uso: con el servidor corriendo con un límite bajo para que el bloque 9 no tarde:
#   RATE_LIMIT_MAX=5 npm run dev            (terminal 1)
#   npm run demo2                           (terminal 2)
# Para guardar la evidencia: npm run demo2 | tee evidencia/demo2-salida.txt
# Opcional: BASE=http://localhost:3000 RATE_LIMIT_MAX=5 bash scripts/demo2.sh
set -u
BASE="${BASE:-http://localhost:3000}"
LIMIT="${RATE_LIMIT_MAX:-5}"
TOKEN=""
STAMP="$(date +%s)"
EMAIL="demo2-${STAMP}@example.com"
PASS="contrasena-demo-2"
HDRS="$(mktemp)"
trap 'rm -f "$HDRS"' EXIT

pretty() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{if(!s.trim())return console.log("(sin cuerpo)");try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch{console.log(s)}})'; }
field()  { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=process.argv[1].split(".").reduce((o,k)=>o&&o[k],JSON.parse(s));console.log(v??"")})' "$1"; }
hoursFromNow() { node -e 'console.log(new Date(Date.now()+Number(process.argv[1])*36e5).toISOString())' "$1"; }

# call "titulo" METHOD RUTA [BODY_JSON] [auth]
call() {
  local title="$1" method="$2" path="$3" body="${4:-}" auth="${5:-}"
  local args=(-s -X "$method" "$BASE$path" -D "$HDRS" -w $'\n%{http_code}')
  local shown="curl -X $method '$BASE$path'"
  if [ -n "$auth" ]; then args+=(-H "Authorization: Bearer $TOKEN"); shown+=" -H 'Authorization: Bearer <TOKEN>'"; fi
  if [ -n "$body" ]; then args+=(-H "Content-Type: application/json" -d "$body"); shown+=" -H 'Content-Type: application/json' -d '$body'"; fi
  echo
  echo "=== $title"
  echo "\$ $shown"
  local out; out="$(curl "${args[@]}")"
  LAST_STATUS="$(echo "$out" | tail -n1)"
  LAST_BODY="$(echo "$out" | sed '$d')"
  echo "HTTP $LAST_STATUS"
  local retry; retry="$(grep -i '^retry-after:' "$HDRS" | tr -d '\r')"
  [ -n "$retry" ] && echo "$retry"
  echo "$LAST_BODY" | pretty | sed -E 's/("token": ")([^"]{24})[^"]*/\1\2.../'
}

echo "Servidor: $BASE"
call "Health check" GET /api/health

# ---------- 1 · Registro + login ----------
call "1 · Registro" POST /api/auth/register "{\"name\":\"Jimena Demo\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
call "1 · Login" POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
TOKEN="$(echo "$LAST_BODY" | field token)"

# ---------- 2 · Crear una actividad con 3 pasos ----------
DUE1="$(hoursFromNow 120)"
call "2 · Crear actividad con 3 pasos (201)" POST /api/activities \
  "{\"title\":\"Entregable 2\",\"course\":\"Tecnologías en el servidor\",\"dueAt\":\"$DUE1\",\"steps\":[{\"text\":\"Leer la rúbrica\",\"estimateMin\":15},{\"text\":\"Programar endpoints\",\"estimateMin\":60},{\"text\":\"Escribir el reporte\",\"estimateMin\":40}]}" auth
ACT_ID="$(echo "$LAST_BODY" | field activity.id)"
STEP1="$(echo "$LAST_BODY" | field activity.steps.0.id)"

# ---------- 3 · Feature 4: editar título y fecha ----------
DUE2="$(hoursFromNow 20)"
call "3 · F4 · Editar título y fecha (200)" PATCH "/api/activities/$ACT_ID" \
  "{\"title\":\"Entregable 2 · backend y front\",\"dueAt\":\"$DUE2\"}" auth

# ---------- 4 · Feature 4: agregar y quitar pasos ----------
call "4 · F4 · Agregar un paso (201)" POST "/api/activities/$ACT_ID/steps" '{"text":"Revisar ortografía","estimateMin":10}' auth
call "4 · F4 · Quitar un paso (200)" DELETE "/api/activities/$ACT_ID/steps/$STEP1" "" auth

# ---------- 5 · Regla de negocio: no se entrega con pasos pendientes ----------
call "5 · F4 · Marcar como entregada con pasos pendientes (409)" PATCH "/api/activities/$ACT_ID" '{"status":"entregada"}' auth

# ---------- 6 · Completar, entregar y comprobar que queda cerrada ----------
call "6 · Consultar la actividad para obtener sus pasos" GET "/api/activities/$ACT_ID" "" auth
STEP_IDS="$(echo "$LAST_BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).activity.steps.map(x=>x.id).join(" ")))')"
for SID in $STEP_IDS; do
  call "6 · Marcar paso como hecho (200)" PATCH "/api/activities/$ACT_ID/steps/$SID" '{"done":true}' auth
done
call "6 · F4 · Marcar como entregada con todos los pasos hechos (200)" PATCH "/api/activities/$ACT_ID" '{"status":"entregada"}' auth
call "6 · F4 · Intentar editar una actividad entregada (409)" PATCH "/api/activities/$ACT_ID" '{"title":"Cambio tardío"}' auth

# ---------- 7 · Feature 5: resumen de carga ----------
call "7 · F5 · Crear otra actividad abierta para el resumen (201)" POST /api/activities \
  "{\"title\":\"Lectura de Bioética\",\"course\":\"Bioética\",\"dueAt\":\"$(hoursFromNow 48)\",\"steps\":[{\"text\":\"Leer capítulo 3\",\"estimateMin\":25},{\"text\":\"Hacer resumen\",\"estimateMin\":20}]}" auth
call "7 · F5 · Resumen de carga (200)" GET /api/summary "" auth

# ---------- 8 · Feature 4: borrar y comprobar que ya no existe ----------
call "8 · F4 · Eliminar la actividad entregada (204)" DELETE "/api/activities/$ACT_ID" "" auth
call "8 · F4 · Consultar la actividad eliminada (404)" GET "/api/activities/$ACT_ID" "" auth

# ---------- 9 · Feature 6: límite de intentos en login ----------
echo
echo "--- 9 · F6 · $((LIMIT + 1)) logins fallidos seguidos (límite del servidor: RATE_LIMIT_MAX=$LIMIT)"
for i in $(seq 1 $((LIMIT + 1))); do
  call "9 · F6 · Login fallido #$i" POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"incorrecta-$i\"}"
done

echo
echo "Listo."
