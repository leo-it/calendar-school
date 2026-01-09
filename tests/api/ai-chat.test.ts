import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock de Groq - crear todo dentro de la factory
vi.mock('groq-sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: class MockGroq {
      chat = {
        completions: {
          create: mockCreate,
        },
      }
      constructor(config: any) {
        // Constructor vacío
      }
    },
  }
})

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    escuela: {
      findMany: vi.fn(),
    },
    clase: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    inscripcion: {
      findMany: vi.fn(),
    },
  },
}))

// Mock de NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
  authOptions: {},
}))

// Importar después de los mocks
import { POST } from '@/app/api/ai/chat/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

describe('API /api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-api-key'
  })

  it('debe rechazar si GROQ_API_KEY no está configurada', async () => {
    // Arrange
    delete process.env.GROQ_API_KEY

    const request = new NextRequest('http://localhost:7000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hola' }),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toContain('API key de Groq no configurada')
  })

  it('debe validar la longitud del mensaje', async () => {
    // Arrange
    process.env.GROQ_API_KEY = 'test-api-key'

    const mockSession = {
      user: {
        id: 'user-123',
      },
    }

    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

    const longMessage = 'a'.repeat(3000) // Más del límite de 2000 caracteres
    const request = new NextRequest('http://localhost:7000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: longMessage }),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toContain('caracteres')
  })

  it('debe validar que el mensaje sea requerido', async () => {
    // Arrange
    process.env.GROQ_API_KEY = 'test-api-key'

    const request = new NextRequest('http://localhost:7000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })
})
