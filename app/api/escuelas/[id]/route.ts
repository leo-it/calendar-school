import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener una escuela específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const escuela = await prisma.escuela.findUnique({
      where: { id: params.id },
      include: {
        usuarios: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        clases: {
          include: {
            profesor: true,
          },
        },
      },
    })

    if (!escuela) {
      return NextResponse.json({ error: 'Escuela no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario tenga acceso (misma escuela o es ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (user && user.role !== 'ADMIN' && user.escuelaId !== params.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(escuela)
  } catch (error) {
    console.error('Error al obtener escuela:', error)
    return NextResponse.json(
      { error: 'Error al obtener escuela' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar una escuela (solo ADMIN)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, direccion, telefono, email, activa } = body

    const escuela = await prisma.escuela.update({
      where: { id: params.id },
      data: {
        nombre,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email || null,
        activa: activa !== undefined ? activa : true,
      },
    })

    return NextResponse.json(escuela)
  } catch (error) {
    console.error('Error al actualizar escuela:', error)
    return NextResponse.json(
      { error: 'Error al actualizar escuela' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una escuela (solo ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.escuela.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Escuela eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar escuela:', error)
    return NextResponse.json(
      { error: 'Error al eliminar escuela' },
      { status: 500 }
    )
  }
}






