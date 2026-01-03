import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar usuarios de la escuela
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo PROFESOR, ADMIN o ADMIN de escuela pueden buscar usuarios
    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const escuelaId = searchParams.get('escuelaId')

    // Obtener el usuario completo
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Determinar la escuela a buscar
    let escuelaIdFiltro: string | undefined
    if (user.role === 'ADMIN' && !user.escuelaId) {
      // ADMIN sin escuela puede buscar en cualquier escuela
      escuelaIdFiltro = escuelaId || undefined
    } else if (user.escuelaId) {
      // Usuario con escuela solo puede buscar en su escuela
      escuelaIdFiltro = user.escuelaId
    } else {
      return NextResponse.json(
        { error: 'Debe tener una escuela asignada' },
        { status: 403 }
      )
    }

    // Construir filtro de búsqueda
    const whereClause: any = {
      role: 'ESTUDIANTE', // Solo buscar estudiantes
    }

    if (escuelaIdFiltro) {
      whereClause.escuelaId = escuelaIdFiltro
    }

    if (query) {
      whereClause.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ]
    }

    const usuarios = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        apellido: true,
        dni: true,
        phone: true,
        escuelaId: true,
      },
      take: 20, // Limitar resultados
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Error al buscar usuarios:', error)
    return NextResponse.json(
      { error: 'Error al buscar usuarios' },
      { status: 500 }
    )
  }
}

