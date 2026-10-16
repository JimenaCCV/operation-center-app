#!/usr/bin/env bash
# Recorre las tres features de la API con requests reales (curl) y muestra cada respuesta con su status HTTP.
# Uso: con el servidor corriendo (npm run dev), en otra terminal: npm run demo
# Opcional: BASE=http://localhost:3000 bash scripts/demo.sh
set -u
BASE="${BASE:-http://localhost:3000}"
TOKEN=""
STAMP="$(date +%s)"
EMAIL="demo${STAMP}@example.com"
PASS="contrasena-demo-1"

pretty() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch{console.log(s)}})'; }
field()  { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=process.argv[1].split(".").reduce((o,k)=>o&&o[k],JSON.parse(s));console.log(v??"")})' "$1"; }
hoursFromNow() { node -e 'console.log(new Date(Date.now()+Number(process.argv[1])*36e5).toISOString())' "$1"; }

# call "titulo" METHOD RUTA [BODY_JSON] [auth]
call() {
  local title="$1" method="$2" path="$3" body="${4:-}" auth="${5:-}"
  local args=(-s -X "$method" "$BASE$path" -w $'\n%{http_code}')
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
  echo "$LAST_BODY" | pretty | sed -E 's/("token": ")([^"]{24})[^"]*/\1\2.../'
}

echo "Servidor: $BASE"
call "Health check" GET /api/health

# ---------- Feature 1 · Autenticación y roles ----------
call "F1 · Registro" POST /api/auth/register "{\"name\":\"Ana Demo\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
call "F1 · Registro con correo repetido (409)" POST /api/auth/register "{\"name\":\"Ana Demo\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
call "F1 · Login" POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
TOKEN="$(echo "$LAST_BODY" | field token)"
call "F1 · Login con contraseña incorrecta (401)" POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"incorrecta-123\"}"
call "F1 · Ruta de admin con usuario normal (403)" GET /api/users "" auth

# ---------- Feature 2 · Actividades con pasos ----------
DUE1="$(hoursFromNow 10)"; DUE2="$(hoursFromNow 120)"
call "F2 · Crear actividad con pasos" POST /api/activities \
  "{\"title\":\"Entregable 1\",\"course\":\"Tecnologías en el servidor\",\"dueAt\":\"$DUE1\",\"steps\":[{\"text\":\"Definir features\",\"estimateMin\":30},{\"text\":\"Escribir README\",\"estimateMin\":20}]}" auth
ACT_ID="$(echo "$LAST_BODY" | field activity.id)"
STEP_ID="$(echo "$LAST_BODY" | field activity.steps.0.id)"
call "F2 · Crear segunda actividad" POST /api/activities \
  "{\"title\":\"Lectura de Bioética\",\"course\":\"Bioética\",\"dueAt\":\"$DUE2\",\"steps\":[{\"text\":\"Leer capítulo 3\",\"estimateMin\":25}]}" auth
call "F2 · Consultar una actividad" GET "/api/activities/$ACT_ID" "" auth
call "F2 · Marcar un paso como hecho" PATCH "/api/activities/$ACT_ID/steps/$STEP_ID" '{"done":true}' auth
call "F2 · Actividad inexistente (404)" GET /api/activities/64b7f0f0f0f0f0f0f0f0f0f0 "" auth

# ---------- Feature 3 · Listar y planear pendientes ----------
call "F3 · Listar con filtro de materia" GET "/api/activities?course=Bio%C3%A9tica&limit=10" "" auth
call "F3 · Listar con filtro de urgencia" GET "/api/activities?urgency=critica" "" auth
call "F3 · Plan para una sesión de 25 minutos" GET "/api/plan?minutes=25" "" auth
call "F3 · Sin token (401)" GET /api/activities

echo
echo "Listo."
