/**
 * Script de migración para agregar campos apellido y dni
 * Ejecutar con: npx tsx scripts/migrate-dni-apellido.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Iniciando migración: agregar campos apellido y dni...')
  
  try {
    // Ejecutar SQL directamente usando Prisma
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apellido" TEXT;
    `)
    console.log('✅ Campo "apellido" agregado a User')

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dni" TEXT;
    `)
    console.log('✅ Campo "dni" agregado a User')

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Profesor" ADD COLUMN IF NOT EXISTS "dni" TEXT;
    `)
    console.log('✅ Campo "dni" agregado a Profesor')

    console.log('✅ Migración completada exitosamente!')
  } catch (error: any) {
    console.error('❌ Error durante la migración:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })

