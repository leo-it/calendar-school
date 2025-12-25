#!/bin/sh
set -e

echo "🔍 [START SCRIPT] Verificando variables de entorno antes de iniciar..."
echo "  - DATABASE_URL existe: $(if [ -n "$DATABASE_URL" ]; then echo 'true'; else echo 'false'; fi)"
echo "  - NEXTAUTH_SECRET existe: $(if [ -n "$NEXTAUTH_SECRET" ]; then echo 'true'; else echo 'false'; fi)"
echo "  - NEXTAUTH_URL: ${NEXTAUTH_URL:-'NO CONFIGURADO'}"
echo "  - PORT: ${PORT:-'NO CONFIGURADO (usando 3000)'}"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está definida!"
  echo "Variables disponibles:"
  env | grep -E "(DATABASE|NEXTAUTH|NODE)" | sed 's/=.*/=***/' || echo "Ninguna variable relevante encontrada"
  exit 1
fi

echo "✅ Variables verificadas. Iniciando aplicación..."
exec node server.js

