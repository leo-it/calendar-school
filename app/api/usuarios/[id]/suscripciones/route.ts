import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const estudianteId = params.id

    // Get student information
    const estudiante = await prisma.user.findUnique({
      where: { id: estudianteId },
      select: {
        id: true,
        email: true,
        name: true,
        apellido: true,
        dni: true,
        phone: true,
        escuelaId: true,
        role: true,
      }
    })

    if (!estudiante) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }

    if (estudiante.role !== 'ESTUDIANTE') {
      return NextResponse.json({ error: 'El usuario no es un estudiante' }, { status: 400 })
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verify access permissions
    if (user.role === 'ADMIN' && !user.escuelaId) {
      // Admin without school can access all students
    } else if (user.escuelaId && estudiante.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    } else if (!user.escuelaId) {
      return NextResponse.json(
        { error: 'Debe tener una escuela asignada' },
        { status: 403 }
      )
    }

    // Get all subscriptions for the student (only with specific dates, exclude recurrent ones)
    const suscripciones = await prisma.claseSubscription.findMany({
      where: {
        userId: estudianteId,
        fecha: { not: null }, // Only get subscriptions with specific dates
      },
      include: {
        clase: {
          include: {
            profesor: {
              select: {
                id: true,
                name: true,
              }
            },
            escuela: {
              select: {
                id: true,
                nombre: true,
              }
            }
          }
        }
      },
      orderBy: [
        { fecha: { sort: 'asc' } },
        { createdAt: 'desc' },
      ],
    })

    // Group subscriptions by month
    const suscripcionesPorMes: Record<string, Array<typeof suscripciones[0]>> = {}

    suscripciones.forEach(sub => {
      if (!sub.fecha) return // Skip if no date (shouldn't happen due to filter, but safety check)
      
      const fecha = sub.fecha instanceof Date ? sub.fecha : new Date(sub.fecha)
      if (isNaN(fecha.getTime())) return // Skip invalid dates
      
      // Format as YYYY-MM
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

      if (!suscripcionesPorMes[mesKey]) {
        suscripcionesPorMes[mesKey] = []
      }
      suscripcionesPorMes[mesKey].push(sub)
    })

    // Sort months: most recent to oldest
    const mesesOrdenados = Object.keys(suscripcionesPorMes).sort((a, b) => {
      return b.localeCompare(a)
    })

    return NextResponse.json({
      estudiante,
      suscripcionesPorMes: mesesOrdenados.reduce((acc, mes) => {
        acc[mes] = suscripcionesPorMes[mes]
        return acc
      }, {} as Record<string, typeof suscripciones>),
      mesesOrdenados,
      totalSuscripciones: suscripciones.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener suscripciones' },
      { status: 500 }
    )
  }
}
