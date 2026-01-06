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
    const { searchParams } = new URL(request.url)
    const fechaParam = searchParams.get('fecha')

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

    // Contar las subscripciones de la clase
    // Si hay fecha específica, contar tanto las suscripciones con esa fecha como las con fecha = null
    // Si no hay fecha, contar solo las suscripciones con fecha = null
    let count: number
    
    if (fechaClase) {
      // Cuando hay fecha específica, contar:
      // 1. Suscripciones con esa fecha específica
      // 2. Suscripciones con fecha = null (aplican a todas las semanas, incluyendo esta fecha)
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM "ClaseSubscription"
        WHERE "claseId" = ${claseId}::text 
          AND (fecha = ${fechaClase}::timestamp OR fecha IS NULL)
      `
      count = Number(result[0]?.count || 0)
    } else {
      // Cuando no hay fecha específica, contar solo suscripciones con fecha = null
      count = await prisma.claseSubscription.count({
        where: {
          claseId: claseId,
          fecha: null,
        },
      })
    }

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

