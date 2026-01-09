#!/bin/bash

# Script para aplicar la migración localmente
# Este script intenta diferentes métodos para aplicar la migración

echo "🔄 Intentando aplicar migración localmente..."

# Método 1: Intentar con psql directamente en localhost
echo "📝 Método 1: Intentando con psql en localhost:5432..."
PGPASSWORD=almanaque_dev_password psql -h localhost -U almanaque -d almanaque -f SQL_MIGRACION.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migración aplicada exitosamente con psql"
    exit 0
fi

# Método 2: Intentar con DATABASE_URL de localhost
echo "📝 Método 2: Intentando con Prisma usando localhost..."
DATABASE_URL="postgresql://almanaque:almanaque_dev_password@localhost:5432/almanaque?schema=public" npx prisma db push --accept-data-loss 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migración aplicada exitosamente con Prisma"
    exit 0
fi

# Método 3: Intentar con el script TypeScript
echo "📝 Método 3: Intentando con script TypeScript usando localhost..."
DATABASE_URL="postgresql://almanaque:almanaque_dev_password@localhost:5432/almanaque?schema=public" npx tsx scripts/migrate-fecha-directo.ts 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migración aplicada exitosamente con script TypeScript"
    exit 0
fi

echo "❌ No se pudo aplicar la migración automáticamente"
echo ""
echo "📋 INSTRUCCIONES MANUALES:"
echo ""
echo "1. Abre un cliente de PostgreSQL (TablePlus, DBeaver, pgAdmin, o psql)"
echo "2. Conéctate a tu base de datos local (probablemente en localhost:5432)"
echo "3. Ejecuta el SQL del archivo SQL_MIGRACION.sql"
echo ""
echo "O si estás usando Railway:"
echo "1. Ve a tu proyecto en Railway"
echo "2. Abre la base de datos PostgreSQL"
echo "3. Ve a la pestaña 'Query'"
echo "4. Ejecuta el SQL del archivo SQL_MIGRACION.sql"
echo ""
exit 1



