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
    let { claseId, fecha } = body

    if (!claseId) {
      return NextResponse.json({ error: 'claseId es requerido' }, { status: 400 })
    }

    // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
    let fechaClase: Date | null = null
    if (claseId.includes('-')) {
      const partes = claseId.split('-')
      claseId = partes[0]
      // Intentar parsear la fecha del formato "id-YYYY-MM-DD"
      if (partes.length >= 4) {
        const fechaStr = `${partes[1]}-${partes[2]}-${partes[3]}`
        fechaClase = new Date(fechaStr)
        if (isNaN(fechaClase.getTime())) {
          fechaClase = null
        }
      }
    }

    // Si se proporciona fecha explícitamente, usarla
    if (fecha) {
      fechaClase = new Date(fecha)
      if (isNaN(fechaClase.getTime())) {
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      }
    }

    // Verificar que la subscripción existe (con fecha específica)
    const subscription = await prisma.claseSubscription.findUnique({
      where: {
        userId_claseId_fecha: {
          userId: session.user.id,
          claseId: claseId,
          fecha: fechaClase as any, // Prisma acepta Date | null pero TypeScript necesita el cast
        },
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No estás subscrito a esta clase' }, { status: 404 })
    }

    // Eliminar subscripción
    await prisma.claseSubscription.delete({
      where: {
        userId_claseId_fecha: {
          userId: session.user.id,
          claseId: claseId,
          fecha: fechaClase as any, // Prisma acepta Date | null pero TypeScript necesita el cast
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

