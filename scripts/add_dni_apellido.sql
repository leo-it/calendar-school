-- Script para agregar campos apellido y dni a las tablas User y Profesor
-- Ejecutar este script directamente en tu base de datos PostgreSQL

-- Agregar campo apellido a User (si no existe)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apellido" TEXT;

-- Agregar campo dni a User (si no existe)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dni" TEXT;

-- Agregar campo dni a Profesor (si no existe)
ALTER TABLE "Profesor" ADD COLUMN IF NOT EXISTS "dni" TEXT;

-- Verificar que los campos se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('User', 'Profesor') 
  AND column_name IN ('apellido', 'dni')
ORDER BY table_name, column_name;

