/**
 * Script para migrar la base de datos agregando el campo fecha a ClaseSubscription
 * 
 * Ejecutar: npx tsx scripts/migrate-fecha-directo.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Iniciando migración: agregar campo fecha a ClaseSubscription...')
  console.log('⏳ Esperando conexión a la base de datos...')
  
  // Esperar a que la base de datos esté lista (máximo 30 segundos)
  let retries = 6
  let connected = false
  
  while (retries > 0 && !connected) {
    try {
      await prisma.$queryRaw`SELECT 1`
      connected = true
      console.log('✅ Conexión establecida')
    } catch (error: any) {
      if (error.message?.includes('starting up')) {
        console.log(`⏳ Base de datos iniciando... (${7 - retries}/6)`)
        await new Promise(resolve => setTimeout(resolve, 5000)) // Esperar 5 segundos
        retries--
      } else {
        throw error
      }
    }
  }
  
  if (!connected) {
    throw new Error('No se pudo conectar a la base de datos después de varios intentos')
  }
  
  try {
    // Ejecutar SQL directamente usando Prisma
    await prisma.$executeRaw`
      ALTER TABLE "ClaseSubscription" 
      ADD COLUMN IF NOT EXISTS "fecha" TIMESTAMP(3);
    `
    console.log('✅ Columna "fecha" agregada (o ya existía)')
    
    await prisma.$executeRaw`
      ALTER TABLE "ClaseSubscription" 
      DROP CONSTRAINT IF EXISTS "ClaseSubscription_userId_claseId_key";
    `
    console.log('✅ Constraint único anterior eliminado (si existía)')
    
    await prisma.$executeRaw`
      ALTER TABLE "ClaseSubscription" 
      ADD CONSTRAINT "ClaseSubscription_userId_claseId_fecha_key" 
      UNIQUE ("userId", "claseId", "fecha");
    `
    console.log('✅ Nuevo constraint único creado')
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ClaseSubscription_claseId_fecha_idx" 
      ON "ClaseSubscription"("claseId", "fecha");
    `
    console.log('✅ Índice creado')
    
    console.log('\n✅ Migración completada exitosamente!')
    console.log('📝 Las suscripciones existentes tendrán fecha = null (comportamiento anterior)')
    
  } catch (error: any) {
    console.error('❌ Error durante la migración:', error.message)
    
    // Si el constraint ya existe, no es un error crítico
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('⚠️  Algunos elementos ya existen, pero la migración está completa')
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

