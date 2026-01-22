import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createPrismaMock, testData } from '../helpers/prisma-mock'

// Mocks ANTES de cualquier import que los use
// Usar función factory directamente
vi.mock('@/lib/prisma', () => {
  return {
    prisma: createPrismaMock(),
  }
})

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
  authOptions: {},
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Importar después de los mocks
import { POST, GET } from '@/app/api/clases/route'
import { PUT } from '@/app/api/clases/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

describe('API /api/clases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST - Crear clase', () => {
    it('debe crear una clase exitosamente cuando el usuario es profesor', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'profesor-123',
          role: 'PROFESOR',
          escuelaId: 'escuela-123',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'profesor-123',
        escuelaId: 'escuela-123',
        role: 'PROFESOR',
      } as any)
      // Mock de escuela (se valida que existe)
      vi.mocked(prisma.escuela.findUnique).mockResolvedValue({
        id: 'escuela-123',
        nombre: 'Escuela de Prueba',
        activa: true,
      } as any)
      // Mock de profesor (se busca por nombre con findMany)
      vi.mocked(prisma.profesor.findMany).mockResolvedValue([
        {
          id: 'profesor-123',
          name: 'Profesor Test',
          apellido: 'Test',
          email: 'profesor@example.com',
        },
      ] as any)
      vi.mocked(prisma.clase.create).mockResolvedValue({
        ...testData.clase,
        profesor: testData.profesor,
        escuela: testData.escuela,
      } as any)

      const requestBody = {
        titulo: 'Clase de Tango',
        descripcion: 'Clase de tango para principiantes',
        diaSemana: 1,
        horaInicio: '18:00',
        horaFin: '19:30',
        nivel: 'PRINCIPIANTE',
        estilo: 'TANGO',
        lugar: 'Salón Principal',
        capacidad: 20,
        profesorNombre: 'Profesor Test', // Necesario para crear la clase
      }

      const request = new NextRequest('http://localhost:7000/api/clases', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.titulo).toBe('Clase de Tango')
      expect(prisma.clase.create).toHaveBeenCalledOnce()
    })

    it('debe rechazar crear clase si el usuario no está autenticado', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:7000/api/clases', {
        method: 'POST',
        body: JSON.stringify(testData.clase),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toContain('No autorizado')
      expect(prisma.clase.create).not.toHaveBeenCalled()
    })

    it('debe rechazar crear clase si el usuario no es profesor o admin', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'user-123',
          role: 'ESTUDIANTE',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:7000/api/clases', {
        method: 'POST',
        body: JSON.stringify(testData.clase),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toContain('No autorizado')
      expect(prisma.clase.create).not.toHaveBeenCalled()
    })

    it('debe validar que horaFin sea posterior a horaInicio', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'profesor-123',
          role: 'PROFESOR',
          escuelaId: 'escuela-123',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'profesor-123',
        escuelaId: 'escuela-123',
        role: 'PROFESOR',
      } as any)

      const requestBody = {
        ...testData.clase,
        horaInicio: '19:00',
        horaFin: '18:00', // Hora fin anterior a inicio
      }

      const request = new NextRequest('http://localhost:7000/api/clases', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(prisma.clase.create).not.toHaveBeenCalled()
    })
  })

  describe('GET - Obtener clases', () => {
    it('debe retornar clases del rango de fechas especificado', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'user-123',
          escuelaId: 'escuela-123',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        escuelaId: 'escuela-123',
        role: 'ESTUDIANTE',
      } as any)
      vi.mocked(prisma.clase.findMany).mockResolvedValue([testData.clase] as any)

      const fechaInicio = '2024-01-01'
      const fechaFin = '2024-01-07'
      const url = `http://localhost:7000/api/clases?inicio=${fechaInicio}&fin=${fechaFin}`
      const request = new NextRequest(url)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(prisma.clase.findMany).toHaveBeenCalled()
    })

    it('debe requerir parámetros inicio y fin', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'user-123',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:7000/api/clases')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Fechas de inicio y fin requeridas')
    })
  })

  describe('PUT - Actualizar clase', () => {
    it('debe actualizar una clase exitosamente cuando el usuario es profesor', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'profesor-123',
          role: 'PROFESOR',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'profesor-123',
        escuelaId: 'escuela-123',
        role: 'PROFESOR',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue({
        id: 'clase-123',
        escuelaId: 'escuela-123',
        titulo: 'Clase Original',
      } as any)
      vi.mocked(prisma.clase.update).mockResolvedValue({
        ...testData.clase,
        titulo: 'Clase Actualizada',
        profesor: testData.profesor,
        escuela: testData.escuela,
      } as any)

      const requestBody = {
        titulo: 'Clase Actualizada',
        descripcion: 'Nueva descripción',
      }

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.titulo).toBe('Clase Actualizada')
      expect(prisma.clase.update).toHaveBeenCalledOnce()
    })

    it('debe actualizar una clase exitosamente cuando el usuario es admin', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'admin-123',
          role: 'ADMIN',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-123',
        escuelaId: null,
        role: 'ADMIN',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue({
        id: 'clase-123',
        escuelaId: 'escuela-123',
        titulo: 'Clase Original',
      } as any)
      vi.mocked(prisma.clase.update).mockResolvedValue({
        ...testData.clase,
        titulo: 'Clase Actualizada por Admin',
        profesor: testData.profesor,
        escuela: testData.escuela,
      } as any)

      const requestBody = {
        titulo: 'Clase Actualizada por Admin',
      }

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.titulo).toBe('Clase Actualizada por Admin')
      expect(prisma.clase.update).toHaveBeenCalledOnce()
    })

    it('debe rechazar actualizar clase si el usuario no está autenticado', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify({ titulo: 'Nuevo título' }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toContain('No autorizado')
      expect(prisma.clase.update).not.toHaveBeenCalled()
    })

    it('debe rechazar actualizar clase si el usuario no es profesor o admin', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'user-123',
          role: 'ESTUDIANTE',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify({ titulo: 'Nuevo título' }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toContain('No autorizado')
      expect(prisma.clase.update).not.toHaveBeenCalled()
    })

    it('debe rechazar actualizar clase si la clase no existe', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'profesor-123',
          role: 'PROFESOR',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'profesor-123',
        escuelaId: 'escuela-123',
        role: 'PROFESOR',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:7000/api/clases/clase-inexistente', {
        method: 'PUT',
        body: JSON.stringify({ titulo: 'Nuevo título' }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-inexistente' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toContain('Clase no encontrada')
      expect(prisma.clase.update).not.toHaveBeenCalled()
    })

    it('debe rechazar actualizar clase si pertenece a otra escuela (profesor)', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'profesor-123',
          role: 'PROFESOR',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'profesor-123',
        escuelaId: 'escuela-123',
        role: 'PROFESOR',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue({
        id: 'clase-123',
        escuelaId: 'escuela-otra',
        titulo: 'Clase de otra escuela',
      } as any)

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify({ titulo: 'Nuevo título' }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toContain('No autorizado para editar esta clase')
      expect(prisma.clase.update).not.toHaveBeenCalled()
    })

    it('debe validar datos inválidos', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'profesor-123',
          role: 'PROFESOR',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'profesor-123',
        escuelaId: 'escuela-123',
        role: 'PROFESOR',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue({
        id: 'clase-123',
        escuelaId: 'escuela-123',
        titulo: 'Clase Original',
      } as any)

      const requestBody = {
        diaSemana: 10, // Inválido (debe ser 0-6) - Zod lo rechazará
      }

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Datos de clase inválidos')
      expect(prisma.clase.update).not.toHaveBeenCalled()
    })

    it('debe permitir a ADMIN cambiar la escuela de una clase', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'admin-123',
          role: 'ADMIN',
        },
      }

      // Usar un CUID válido para escuelaId (formato CUID)
      const escuelaNuevaId = 'clxy1234567890abcdefghij'

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-123',
        escuelaId: null,
        role: 'ADMIN',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue({
        id: 'clase-123',
        escuelaId: 'escuela-123',
        titulo: 'Clase Original',
      } as any)
      vi.mocked(prisma.escuela.findUnique).mockResolvedValue({
        id: escuelaNuevaId,
        nombre: 'Nueva Escuela',
        activa: true,
      } as any)
      vi.mocked(prisma.clase.update).mockResolvedValue({
        ...testData.clase,
        escuelaId: escuelaNuevaId,
        profesor: testData.profesor,
        escuela: { ...testData.escuela, id: escuelaNuevaId },
      } as any)

      const requestBody = {
        escuelaId: escuelaNuevaId,
      }

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(prisma.escuela.findUnique).toHaveBeenCalledWith({
        where: { id: escuelaNuevaId },
      })
      expect(prisma.clase.update).toHaveBeenCalledOnce()
    })

    it('debe rechazar cambiar escuela si la nueva escuela no existe (ADMIN)', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'admin-123',
          role: 'ADMIN',
        },
      }

      // Usar un CUID válido para escuelaId (formato CUID)
      const escuelaInexistenteId = 'clxy99999999999999999999'

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-123',
        escuelaId: null,
        role: 'ADMIN',
      } as any)
      vi.mocked(prisma.clase.findUnique).mockResolvedValue({
        id: 'clase-123',
        escuelaId: 'escuela-123',
        titulo: 'Clase Original',
      } as any)
      vi.mocked(prisma.escuela.findUnique).mockResolvedValue(null)

      const requestBody = {
        escuelaId: escuelaInexistenteId,
      }

      const request = new NextRequest('http://localhost:7000/api/clases/clase-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await PUT(request, { params: { id: 'clase-123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('La escuela especificada no existe')
      expect(prisma.clase.update).not.toHaveBeenCalled()
    })
  })
})
