import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el usuario completo para acceder a su escuelaId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si es ADMIN sin escuela asignada, mostrar todos los profesores
    // Si tiene escuela asignada o es PROFESOR/ESTUDIANTE, filtrar por escuela
    if (user.role === 'ADMIN' && !user.escuelaId) {
      const profesores = await prisma.profesor.findMany({
        orderBy: {
          name: 'asc',
        },
      })
      return NextResponse.json(profesores)
    } else if (user.escuelaId) {
      // Obtener profesores que tienen clases en la escuela del usuario
      const clases = await prisma.clase.findMany({
        where: {
          escuelaId: user.escuelaId,
          activa: true,
        },
        select: {
          profesorId: true,
        },
        distinct: ['profesorId'],
      })

      const profesorIds = clases.map((c: { profesorId: string }) => c.profesorId)

      if (profesorIds.length === 0) {
        return NextResponse.json([])
      }

      const profesores = await prisma.profesor.findMany({
        where: {
          id: { in: profesorIds },
        },
        orderBy: {
          name: 'asc',
        },
      })

      return NextResponse.json(profesores)
    } else {
      // Usuario sin escuela asignada (no debería pasar, pero por seguridad)
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Error al obtener profesores:', error)
    return NextResponse.json(
      { error: 'Error al obtener profesores' },
      { status: 500 }
    )
  }
}



