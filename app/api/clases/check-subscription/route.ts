import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let claseId = searchParams.get('claseId')

    if (!claseId) {
      return NextResponse.json({ error: 'claseId es requerido' }, { status: 400 })
    }

    // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
    claseId = claseId.includes('-') ? claseId.split('-')[0] : claseId

    // Verificar si el usuario está subscrito
    const subscription = await prisma.claseSubscription.findUnique({
      where: {
        userId_claseId: {
          userId: session.user.id,
          claseId: claseId,
        },
      },
    })

    return NextResponse.json({ isSubscribed: !!subscription })
  } catch (error) {
    console.error('Error al verificar subscripción:', error)
    return NextResponse.json(
      { error: 'Error al verificar subscripción' },
      { status: 500 }
    )
  }
}

