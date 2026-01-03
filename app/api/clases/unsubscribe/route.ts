import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    let { claseId } = body

    if (!claseId) {
      return NextResponse.json({ error: 'claseId es requerido' }, { status: 400 })
    }

    // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
    claseId = claseId.includes('-') ? claseId.split('-')[0] : claseId

    // Verificar que la subscripción existe
    const subscription = await prisma.claseSubscription.findUnique({
      where: {
        userId_claseId: {
          userId: session.user.id,
          claseId: claseId,
        },
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No estás subscrito a esta clase' }, { status: 404 })
    }

    // Eliminar subscripción
    await prisma.claseSubscription.delete({
      where: {
        userId_claseId: {
          userId: session.user.id,
          claseId: claseId,
        },
      },
    })

    return NextResponse.json({ message: 'Te has dado de baja correctamente' })
  } catch (error) {
    console.error('Error al darse de baja de clase:', error)
    return NextResponse.json(
      { error: 'Error al darse de baja' },
      { status: 500 }
    )
  }
}

