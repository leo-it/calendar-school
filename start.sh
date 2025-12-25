#!/bin/sh
set -e

echo "🔍 [START SCRIPT] Verificando variables de entorno antes de iniciar..."

# Buscar DATABASE_URL incluso si tiene espacios en el nombre
# Railway a veces inyecta variables con espacios, necesitamos encontrarlas
DATABASE_URL_VALUE=$(env | grep -i "database_url" | head -1 | cut -d'=' -f2-)

if [ -z "$DATABASE_URL_VALUE" ]; then
  # Intentar con espacios
  DATABASE_URL_VALUE=$(env | grep " DATABASE_URL" | head -1 | cut -d'=' -f2-)
fi

# Exportar DATABASE_URL sin espacios para que la aplicación la pueda usar
if [ -n "$DATABASE_URL_VALUE" ]; then
  export DATABASE_URL="$DATABASE_URL_VALUE"
  echo "  - DATABASE_URL existe: true"
  echo "  - DATABASE_URL (primeros 20 chars): $(echo "$DATABASE_URL" | cut -c1-20)..."
else
  echo "  - DATABASE_URL existe: false"
fi

echo "  - NEXTAUTH_SECRET existe: $(if [ -n "$NEXTAUTH_SECRET" ]; then echo 'true'; else echo 'false'; fi)"
echo "  - NEXTAUTH_URL: ${NEXTAUTH_URL:-'NO CONFIGURADO'}"
echo "  - PORT: ${PORT:-'NO CONFIGURADO (usando 3000)'}"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está definida!"
  echo "Variables disponibles con 'DATABASE' en el nombre:"
  env | grep -i "database" | sed 's/=.*/=***/' || echo "Ninguna variable encontrada"
  echo ""
  echo "Todas las variables de entorno:"
  env | sort | head -20
  exit 1
fi

echo "✅ Variables verificadas. Iniciando aplicación..."
exec node server.js

