#!/usr/bin/env bash
# Entregable 4: recorrido para grabar el video (ver evidencia/GUION-VIDEO.md).
# login → crear actividad con 3 pasos → entregar (409) → marcar pasos → entregar (200) → resumen.
# Pausa entre pasos (Enter para seguir) para narrar sin prisa. Sin terminal interactiva no pausa.
# Uso: con el servidor corriendo (npm run dev), en otra terminal: bash scripts/demo-video.sh
# Opcional: BASE=http://localhost:3000 bash scripts/demo-video.sh
set -u
BASE="${BASE:-http://localhost:3000}"
TOKEN=""
STAMP="$(date +%s)"
EMAIL="video${STAMP}@example.com"
PASS="contrasena-video-1"

pretty() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{if(!s.trim())return console.log("(sin cuerpo)");try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch{console.log(s)}})'; }
field()  { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=process.argv[1].split(".").reduce((o,k)=>o&&o[k],JSON.parse(s));console.log(v??"")})' "$1"; }
hoursFromNow() { node -e 'console.log(new Date(Date.now()+Number(process.argv[1])*36e5).toISOString())' "$1"; }
pause() { if [ -t 0 ]; then echo; read -r -p "Enter para continuar " _; fi; }

# call "titulo" METHOD RUTA [BODY_JSON] [auth]
call() {
  local title="$1" method="$2" path="$3" body="${4:-}" auth="${5:-}"
  local args=(-s -X "$method" "$BASE$path" -w $'\n%{http_code}')
  local shown="$method $path"
  if [ -n "$auth" ]; then args+=(-H "Authorization: Bearer $TOKEN"); fi
  if [ -n "$body" ]; then args+=(-H "Content-Type: application/json" -d "$body"); fi
  echo
  echo "=== $title"
  echo "→ $shown"
  [ -n "$body" ] && echo "  body: $body"
  local out; out="$(curl "${args[@]}")"
  LAST_STATUS="$(echo "$out" | tail -n1)"
  LAST_BODY="$(echo "$out" | sed '$d')"
  echo "← HTTP $LAST_STATUS"
  echo "$LAST_BODY" | pretty | sed -E 's/("token": ")([^"]{24})[^"]*/\1.../'
}

echo "Centro de Operaciones AI · demo del flujo de la API ($BASE)"

# 1 · Cuenta y login (el registro solo prepara un usuario nuevo para el video)
curl -s -o /dev/null -X POST "$BASE/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"Jimena Video\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
call "1 · Login" POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
TOKEN="$(echo "$LAST_BODY" | field token)"
if [ -z "$TOKEN" ]; then
  echo "No se obtuvo token (HTTP $LAST_STATUS). Si es 429, reinicia el servidor: el límite de intentos vive en memoria."
  exit 1
fi
pause

# 2 · Crear una actividad con 3 pasos
call "2 · Crear actividad con 3 pasos" POST /api/activities \
  "{\"title\":\"Entregable 4\",\"course\":\"Tecnologías en el servidor\",\"dueAt\":\"$(hoursFromNow 48)\",\"steps\":[{\"text\":\"Migrar pruebas a Jest\",\"estimateMin\":40},{\"text\":\"Grabar el video\",\"estimateMin\":30},{\"text\":\"Exportar el reporte\",\"estimateMin\":20}]}" auth
ACT_ID="$(echo "$LAST_BODY" | field activity.id)"
STEP_IDS="$(echo "$LAST_BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).activity.steps.map(x=>x.id).join(" ")))')"
pause

# 3 · Regla de negocio: no se entrega con pasos pendientes (checkClose → 409)
call "3 · Marcar como entregada con 3 pasos pendientes" PATCH "/api/activities/$ACT_ID" '{"status":"entregada"}' auth
pause

# 4 · Completar los pasos
for SID in $STEP_IDS; do
  call "4 · Marcar paso como hecho" PATCH "/api/activities/$ACT_ID/steps/$SID" '{"done":true}' auth
done
pause

# 5 · El mismo PATCH ahora sí pasa
call "5 · Marcar como entregada con todo hecho" PATCH "/api/activities/$ACT_ID" '{"status":"entregada"}' auth
pause

# 6 · Resumen de carga
call "6 · Resumen de carga" GET /api/summary "" auth

echo
echo "Listo."
