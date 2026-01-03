import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
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

    let claseId = params.id

    // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
    claseId = claseId.includes('-') ? claseId.split('-')[0] : claseId

    // Contar las subscripciones de la clase
    const count = await prisma.claseSubscription.count({
      where: {
        claseId: claseId,
      },
    })

    // Obtener la capacidad de la clase
    const clase = await prisma.clase.findUnique({
      where: { id: claseId },
      select: { capacidad: true },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      inscritos: count,
      capacidad: clase.capacidad,
      cuposDisponibles: clase.capacidad - count,
    })
  } catch (error) {
    console.error('Error al obtener conteo de subscripciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener conteo de subscripciones' },
      { status: 500 }
    )
  }
}

