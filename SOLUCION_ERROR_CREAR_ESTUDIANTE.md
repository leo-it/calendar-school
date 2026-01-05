# Solución: Error al Crear Estudiante

## Problema

Al intentar crear un estudiante, aparece el error:
```
The column `ClaseSubscription.fecha` does not exist in the current database.
```

## Causa

El schema de Prisma tiene el campo `fecha` en `ClaseSubscription`, pero la base de datos no tiene esa columna. Esto ocurre porque la migración no se ha aplicado.

## Solución

Necesitas agregar la columna `fecha` a la tabla `ClaseSubscription` en tu base de datos.

### Opción 1: Ejecutar SQL directamente (Recomendado)

1. **Conéctate a tu base de datos PostgreSQL** usando tu cliente favorito (TablePlus, DBeaver, pgAdmin, psql, etc.)

2. **Ejecuta este SQL**:

```sql
-- Agregar la columna fecha
ALTER TABLE "ClaseSubscription" 
ADD COLUMN IF NOT EXISTS "fecha" TIMESTAMP(3);

-- Eliminar el constraint único anterior (si existe)
ALTER TABLE "ClaseSubscription" 
DROP CONSTRAINT IF EXISTS "ClaseSubscription_userId_claseId_key";

-- Crear nuevo constraint único con fecha
ALTER TABLE "ClaseSubscription" 
ADD CONSTRAINT "ClaseSubscription_userId_claseId_fecha_key" 
UNIQUE ("userId", "claseId", "fecha");

-- Crear índice para optimizar queries
CREATE INDEX IF NOT EXISTS "ClaseSubscription_claseId_fecha_idx" 
ON "ClaseSubscription"("claseId", "fecha");
```

3. **Verifica que se aplicó correctamente**:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ClaseSubscription' 
AND column_name = 'fecha';
```

Deberías ver una fila con `fecha` de tipo `timestamp without time zone`.

### Opción 2: Usar Prisma DB Push

Si tienes acceso a la base de datos desde la línea de comandos:

```bash
# Si la base de datos está en localhost
DATABASE_URL="postgresql://usuario:password@localhost:5432/almanaque?schema=public" npx prisma db push

# O si está en Railway/otro servicio, usa tu DATABASE_URL real
npx prisma db push
```

### Opción 3: Si estás usando Railway

1. Ve a tu proyecto en Railway
2. Abre la base de datos PostgreSQL
3. Ve a la pestaña "Data" o "Query"
4. Ejecuta el SQL de la Opción 1

### Opción 4: Si estás usando Docker

1. Asegúrate de que Docker esté corriendo:
```bash
docker ps
```

2. Si el contenedor está corriendo, ejecuta:
```bash
docker exec -i almanaque-postgres psql -U almanaque -d almanaque < scripts/add_fecha_column.sql
```

O ejecuta el SQL manualmente dentro del contenedor:
```bash
docker exec -it almanaque-postgres psql -U almanaque -d almanaque
```

Luego pega y ejecuta el SQL de la Opción 1.

## Verificación

Después de aplicar la migración, intenta crear un estudiante nuevamente. El error debería desaparecer.

## Nota

Las suscripciones existentes tendrán `fecha = null`, lo cual es correcto y representa el comportamiento anterior (suscripción a todas las semanas de la clase).

