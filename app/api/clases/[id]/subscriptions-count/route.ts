import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    logger.debug('Iniciando consulta de conteo de suscripciones', { requestId })
    
    const session = await getServerSession(authOptions)
    if (!session) {
      logger.warn('Intento de consulta de conteo sin autorización', { requestId, ip: request.ip })
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
      // 1. Suscripciones con esa fecha específica (comparando solo por día, sin hora)
      // 2. Suscripciones con fecha = null (aplican a todas las semanas, incluyendo esta fecha)
      const fechaBuscadaStr = fechaClase.toISOString().split('T')[0] // "2026-01-10"
      logger.debug('Consultando conteo con fecha específica', {
        requestId,
        claseId,
        fechaClase: fechaClase.toISOString(),
        fechaBuscadaStr,
      })
      
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM "ClaseSubscription"
        WHERE "claseId" = ${claseId}::text 
          AND (
            ("fecha" IS NOT NULL AND DATE("fecha")::text = ${fechaBuscadaStr}::text)
            OR "fecha" IS NULL
          )
      `
      count = Number(result[0]?.count || 0)
      
      logger.debug('Resultado de conteo con fecha', {
        requestId,
        claseId,
        fechaClase: fechaClase.toISOString(),
        count,
      })
    } else {
      // Cuando no hay fecha específica, contar solo suscripciones con fecha = null
      logger.debug('Consultando conteo sin fecha específica', { requestId, claseId })
      
      count = await prisma.claseSubscription.count({
        where: {
          claseId: claseId,
          fecha: null,
        },
      })
      
      logger.debug('Resultado de conteo sin fecha', { requestId, claseId, count })
    }

    // Obtener la capacidad de la clase
    const clase = await prisma.clase.findUnique({
      where: { id: claseId },
      select: { capacidad: true },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    const response = {
      inscritos: count,
      capacidad: clase.capacidad,
      cuposDisponibles: clase.capacidad - count,
    }
    
    logger.info('Conteo de suscripciones obtenido', {
      requestId,
      claseId,
      fecha: fechaClase?.toISOString() || null,
      inscritos: count,
      capacidad: clase.capacidad,
      cuposDisponibles: response.cuposDisponibles,
      duration: Date.now() - startTime,
    })
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error al obtener conteo de subscripciones', error, {
      requestId,
      claseId: params.id,
      duration: Date.now() - startTime,
      stack: (error as Error).stack,
    })
    
    return NextResponse.json(
      { error: 'Error al obtener conteo de subscripciones' },
      { status: 500 }
    )
  }
}

