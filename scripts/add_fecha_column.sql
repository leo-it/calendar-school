-- Script para agregar la columna 'fecha' a ClaseSubscription
-- Ejecutar este script directamente en la base de datos

-- 1. Agregar la columna fecha (nullable)
ALTER TABLE "ClaseSubscription" 
ADD COLUMN IF NOT EXISTS "fecha" TIMESTAMP;

-- 2. Eliminar el constraint único antiguo si existe (userId, claseId)
-- Nota: Necesitamos encontrar el nombre del constraint primero
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Buscar el constraint único antiguo
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'ClaseSubscription'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'ClaseSubscription'::regclass AND attname = 'userId')
    AND conkey[2] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'ClaseSubscription'::regclass AND attname = 'claseId');
    
    -- Si existe, eliminarlo
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "ClaseSubscription" DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- 3. Crear el nuevo constraint único (userId, claseId, fecha)
-- Nota: PostgreSQL permite múltiples NULLs en un constraint único, así que esto funcionará
ALTER TABLE "ClaseSubscription"
ADD CONSTRAINT "ClaseSubscription_userId_claseId_fecha_key" 
UNIQUE ("userId", "claseId", "fecha");

-- 4. Crear índice para optimizar queries
CREATE INDEX IF NOT EXISTS "ClaseSubscription_claseId_fecha_idx" 
ON "ClaseSubscription" ("claseId", "fecha");

-- Verificar que se aplicó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ClaseSubscription' 
AND column_name = 'fecha';

