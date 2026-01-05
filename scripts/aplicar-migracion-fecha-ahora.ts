/**
 * Script para aplicar la migración de fecha inmediatamente
 * Usa la misma configuración de DATABASE_URL que la aplicación
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Aplicando migración: agregar columna fecha a ClaseSubscription...')
  console.log('📝 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NO CONFIGURADA')
  
  try {
    // Paso 1: Agregar columna fecha
    console.log('\n1️⃣ Agregando columna fecha...')
    await prisma.$executeRaw`
      ALTER TABLE "ClaseSubscription" 
      ADD COLUMN IF NOT EXISTS "fecha" TIMESTAMP(3);
    `
    console.log('   ✅ Columna fecha agregada')
    
    // Paso 2: Eliminar constraint único anterior si existe
    console.log('\n2️⃣ Eliminando constraint único anterior...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ClaseSubscription" 
        DROP CONSTRAINT IF EXISTS "ClaseSubscription_userId_claseId_key";
      `
      console.log('   ✅ Constraint anterior eliminado (si existía)')
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('   ℹ️  Constraint anterior no existía (ok)')
      } else {
        throw error
      }
    }
    
    // Paso 3: Crear nuevo constraint único con fecha
    console.log('\n3️⃣ Creando nuevo constraint único...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ClaseSubscription" 
        ADD CONSTRAINT "ClaseSubscription_userId_claseId_fecha_key" 
        UNIQUE ("userId", "claseId", "fecha");
      `
      console.log('   ✅ Nuevo constraint único creado')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('   ℹ️  Constraint ya existe (ok)')
      } else {
        throw error
      }
    }
    
    // Paso 4: Crear índice
    console.log('\n4️⃣ Creando índice...')
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ClaseSubscription_claseId_fecha_idx" 
      ON "ClaseSubscription"("claseId", "fecha");
    `
    console.log('   ✅ Índice creado')
    
    // Verificación
    console.log('\n5️⃣ Verificando migración...')
    const result = await prisma.$queryRaw<Array<{column_name: string, data_type: string, is_nullable: string}>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ClaseSubscription' 
      AND column_name = 'fecha';
    `
    
    if (result.length > 0) {
      console.log('   ✅ Columna fecha existe:', result[0])
      console.log('\n🎉 ¡Migración completada exitosamente!')
    } else {
      console.log('   ⚠️  Advertencia: No se pudo verificar la columna')
    }
    
  } catch (error: any) {
    console.error('\n❌ Error durante la migración:', error.message)
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('⚠️  Algunos elementos ya existen, pero la migración debería estar completa')
    } else {
      throw error
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

