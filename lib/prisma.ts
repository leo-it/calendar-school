import { PrismaClient } from '@prisma/client'

// Debug: Verificar DATABASE_URL antes de inicializar Prisma
console.log('🔍 [PRISMA DEBUG] Verificando DATABASE_URL antes de inicializar Prisma...')
console.log('  - DATABASE_URL existe:', !!process.env.DATABASE_URL)
console.log('  - DATABASE_URL tipo:', typeof process.env.DATABASE_URL)
console.log('  - DATABASE_URL longitud:', process.env.DATABASE_URL?.length || 0)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL
  // Mostrar solo los primeros y últimos caracteres por seguridad
  const masked = dbUrl.length > 40 
    ? dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 20)
    : dbUrl.substring(0, 10) + '...'
  console.log('  - DATABASE_URL (masked):', masked)
  console.log('  - DATABASE_URL empieza con:', dbUrl.substring(0, 12))
} else {
  console.error('❌ ERROR CRÍTICO: DATABASE_URL no está disponible!')
  console.error('Variables de entorno disponibles:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('POSTGRES')).join(', '))
  console.error('Todas las variables:', Object.keys(process.env).sort().join(', '))
  console.error('Valor de DATABASE_URL (raw):', JSON.stringify(process.env.DATABASE_URL))
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma



