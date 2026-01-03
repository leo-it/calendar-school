import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    // Verificar que la clase existe
    const clase = await prisma.clase.findUnique({
      where: { id: claseId },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    // Crear o verificar subscripción
    const subscription = await prisma.claseSubscription.upsert({
      where: {
        userId_claseId: {
          userId: session.user.id,
          claseId: claseId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        claseId: claseId,
      },
    })

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Error al subscribirse a clase:', error)
    return NextResponse.json(
      { error: 'Error al subscribirse' },
      { status: 500 }
    )
  }
}



