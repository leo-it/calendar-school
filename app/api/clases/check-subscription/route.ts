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
    const fechaParam = searchParams.get('fecha')

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
    if (fechaParam) {
      fechaClase = new Date(fechaParam)
      if (isNaN(fechaClase.getTime())) {
        fechaClase = null
      }
    }

    // Verificar si el usuario está subscrito (con fecha específica)
    const subscription = await prisma.claseSubscription.findUnique({
      where: {
        userId_claseId_fecha: {
          userId: session.user.id,
          claseId: claseId,
          fecha: fechaClase as any, // Prisma acepta Date | null pero TypeScript necesita el cast
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

