-- ============================================
-- MIGRACIÓN: Agregar campo fecha a ClaseSubscription
-- ============================================
-- Ejecuta este SQL directamente en tu base de datos PostgreSQL
-- Puedes usar TablePlus, DBeaver, pgAdmin, o cualquier cliente de PostgreSQL
--
-- INSTRUCCIONES:
-- 1. Conéctate a tu base de datos de Railway
-- 2. Abre una nueva query/consulta
-- 3. Copia y pega todo este archivo
-- 4. Ejecuta la consulta
-- ============================================

-- Paso 1: Agregar columna fecha
ALTER TABLE "ClaseSubscription" 
ADD COLUMN IF NOT EXISTS "fecha" TIMESTAMP(3);

-- Paso 2: Eliminar el constraint único anterior (si existe)
ALTER TABLE "ClaseSubscription" 
DROP CONSTRAINT IF EXISTS "ClaseSubscription_userId_claseId_key";

-- Paso 3: Crear nuevo constraint único con fecha
ALTER TABLE "ClaseSubscription" 
ADD CONSTRAINT "ClaseSubscription_userId_claseId_fecha_key" 
UNIQUE ("userId", "claseId", "fecha");

-- Paso 4: Crear índice para optimizar queries
CREATE INDEX IF NOT EXISTS "ClaseSubscription_claseId_fecha_idx" 
ON "ClaseSubscription"("claseId", "fecha");

-- ============================================
-- VERIFICACIÓN (opcional - ejecuta para verificar)
-- ============================================
-- Verificar que la columna existe:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'ClaseSubscription' AND column_name = 'fecha';
--
-- Verificar el constraint único:
-- SELECT constraint_name 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'ClaseSubscription' 
-- AND constraint_type = 'UNIQUE';
-- ============================================

