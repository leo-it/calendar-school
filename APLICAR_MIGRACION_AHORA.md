# ⚠️ URGENTE: Aplicar Migración para Solucionar el Error

## El Error que Estás Viendo

El error indica que falta la columna `fecha` en la tabla `ClaseSubscription`. Esto está causando que no puedas:
- Suscribirte a clases
- Crear estudiantes
- Ver suscriptores

## Solución Rápida (5 minutos)

### Opción 1: Si estás usando Railway (Recomendado)

1. **Ve a tu proyecto en Railway**: https://railway.app
2. **Abre tu base de datos PostgreSQL**
3. **Ve a la pestaña "Query" o "Data"**
4. **Copia y pega este SQL**:

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

5. **Ejecuta el SQL** (botón "Run" o "Execute")
6. **¡Listo!** Recarga la aplicación y el error debería desaparecer

### Opción 2: Si estás usando Docker localmente

1. **Asegúrate de que Docker esté corriendo**:
```bash
docker ps
```

2. **Si el contenedor está corriendo, ejecuta**:
```bash
docker exec -i almanaque-postgres psql -U almanaque -d almanaque < SQL_MIGRACION.sql
```

O ejecuta el SQL manualmente:
```bash
docker exec -it almanaque-postgres psql -U almanaque -d almanaque
```

Luego pega y ejecuta el SQL de arriba.

### Opción 3: Si tienes acceso directo a PostgreSQL

1. **Conéctate a tu base de datos** usando cualquier cliente (TablePlus, DBeaver, pgAdmin, psql, etc.)
2. **Ejecuta el SQL** del archivo `SQL_MIGRACION.sql` o el que está arriba
3. **¡Listo!**

## Verificación

Después de ejecutar el SQL, verifica que funcionó:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ClaseSubscription' 
AND column_name = 'fecha';
```

Deberías ver una fila con `fecha` de tipo `timestamp without time zone`.

## ¿Qué hace esta migración?

- ✅ Agrega la columna `fecha` a `ClaseSubscription` (permite suscripciones por fecha específica)
- ✅ Actualiza el constraint único para incluir `fecha` (permite múltiples suscripciones a la misma clase en fechas diferentes)
- ✅ Crea un índice para optimizar las consultas

## Nota Importante

Las suscripciones existentes tendrán `fecha = null`, lo cual es correcto y representa el comportamiento anterior (suscripción a todas las semanas de la clase).

---

**Una vez aplicada la migración, recarga la aplicación y el error debería desaparecer.** ✅

