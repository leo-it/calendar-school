import { vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

/**
 * Helper para crear mocks de Prisma
 * Permite simular respuestas de la base de datos en tests
 */
export function createPrismaMock() {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    clase: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    escuela: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    profesor: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    inscripcion: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    suscripcion: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  } as unknown as PrismaClient

  return mockPrisma
}

/**
 * Datos de prueba predefinidos para evitar repetir código
 */
export const testData = {
  usuario: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test',
    apellido: 'User',
    role: 'ESTUDIANTE',
    escuelaId: 'escuela-123',
  },
  escuela: {
    id: 'escuela-123',
    nombre: 'Escuela de Prueba',
    activa: true,
  },
  clase: {
    id: 'clase-123',
    titulo: 'Clase de Tango',
    descripcion: 'Clase de tango para principiantes',
    diaSemana: 1, // Lunes
    horaInicio: '18:00',
    horaFin: '19:30',
    nivel: 'PRINCIPIANTE',
    estilo: 'TANGO',
    lugar: 'Salón Principal',
    capacidad: 20,
    activa: true,
    escuelaId: 'escuela-123',
    profesorId: 'profesor-123',
  },
  profesor: {
    id: 'profesor-123',
    name: 'Profesor',
    apellido: 'Test',
    email: 'profesor@example.com',
  },
}

