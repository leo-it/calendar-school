import { PrismaClient } from '@prisma/client'

// Debug: Verificar DATABASE_URL antes de inicializar Prisma
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR CRÍTICO: DATABASE_URL no está disponible!')
  console.error('Variables de entorno disponibles:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('POSTGRES')).join(', '))
  console.error('Todas las variables:', Object.keys(process.env).sort().join(', '))
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma



