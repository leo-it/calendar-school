import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Determine school filter based on user permissions
    let escuelaIdFiltro: string | undefined
    if (user.role === 'ADMIN' && !user.escuelaId) {
      // Admin without school can see all students
      escuelaIdFiltro = undefined
    } else if (user.escuelaId) {
      // User with school can only see students from their school
      escuelaIdFiltro = user.escuelaId
    } else {
      return NextResponse.json(
        { error: 'Debe tener una escuela asignada' },
        { status: 403 }
      )
    }

    const whereClause: any = {
      role: 'ESTUDIANTE',
    }

    if (escuelaIdFiltro) {
      whereClause.escuelaId = escuelaIdFiltro
    }

    const estudiantes = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        apellido: true,
        dni: true,
        phone: true,
        escuelaId: true,
        createdAt: true,
        escuela: {
          select: {
            id: true,
            nombre: true,
          }
        }
      },
      orderBy: [
        { apellido: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(estudiantes)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener estudiantes' },
      { status: 500 }
    )
  }
}
