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

# Limpiar el valor: eliminar espacios al inicio y final, y caracteres de control
if [ -n "$DATABASE_URL_VALUE" ]; then
  # Eliminar espacios al inicio y final, y cualquier carácter de control
  DATABASE_URL_CLEAN=$(echo "$DATABASE_URL_VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -d '\r\n')
  
  # Verificar que empiece con postgresql:// o postgres://
  if echo "$DATABASE_URL_CLEAN" | grep -qE '^(postgresql|postgres)://'; then
    export DATABASE_URL="$DATABASE_URL_CLEAN"
    echo "  - DATABASE_URL existe: true"
    echo "  - DATABASE_URL (primeros 30 chars): $(echo "$DATABASE_URL" | cut -c1-30)..."
    echo "  - DATABASE_URL longitud: $(echo "$DATABASE_URL" | wc -c)"
  else
    echo "  - DATABASE_URL existe pero formato inválido"
    echo "  - Valor (primeros 50 chars): $(echo "$DATABASE_URL_CLEAN" | cut -c1-50)"
    echo "  - Debe empezar con 'postgresql://' o 'postgres://'"
    DATABASE_URL_CLEAN=""
  fi
else
  echo "  - DATABASE_URL existe: false"
fi

echo "  - NEXTAUTH_SECRET existe: $(if [ -n "$NEXTAUTH_SECRET" ]; then echo 'true'; else echo 'false'; fi)"
echo "  - NEXTAUTH_URL: ${NEXTAUTH_URL:-'NO CONFIGURADO'}"
echo "  - PORT: ${PORT:-'NO CONFIGURADO (usando 3000)'}"

if [ -z "$DATABASE_URL" ] || [ -z "$DATABASE_URL_CLEAN" ]; then
  echo "❌ ERROR: DATABASE_URL no está definida o tiene formato inválido!"
  echo "Variables disponibles con 'DATABASE' en el nombre:"
  env | grep -i "database" | sed 's/=.*/=***/' || echo "Ninguna variable encontrada"
  echo ""
  echo "Valor crudo de DATABASE_URL (primeros 100 chars):"
  echo "$DATABASE_URL_VALUE" | head -c 100
  echo ""
  exit 1
fi

echo "✅ Variables verificadas."

# Verificar si las tablas existen y crearlas si no existen
echo "🔍 Verificando si las tablas de la base de datos existen..."
# Intentar crear las tablas (db push es idempotente, no hace daño si ya existen)
echo "📦 Ejecutando Prisma db push para crear/actualizar tablas..."
npx prisma db push --accept-data-loss --skip-generate
if [ $? -eq 0 ]; then
  echo "✅ Tablas verificadas/creadas exitosamente"
else
  echo "⚠️  Error al crear tablas, pero continuando..."
fi

echo "🚀 Iniciando aplicación..."
exec node server.js

