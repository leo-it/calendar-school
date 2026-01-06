import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    logger.info('Iniciando baja de suscripción', { requestId })
    
    const session = await getServerSession(authOptions)
    if (!session) {
      logger.warn('Intento de baja sin autorización', { requestId, ip: request.ip })
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

    logger.debug('Buscando suscripción para eliminar', { 
      requestId, 
      userId: session.user.id, 
      claseId, 
      fecha: fechaClase?.toISOString() || null 
    })

    // Verificar que la subscripción existe
    // Cuando fecha es null, no podemos usar findUnique con el índice compuesto
    // Necesitamos usar findFirst con un where condicional
    let subscription
    if (fechaClase === null) {
      subscription = await prisma.claseSubscription.findFirst({
        where: {
          userId: session.user.id,
          claseId: claseId,
          fecha: null,
        },
      })
    } else {
      subscription = await prisma.claseSubscription.findUnique({
        where: {
          userId_claseId_fecha: {
            userId: session.user.id,
            claseId: claseId,
            fecha: fechaClase,
          },
        },
      })
    }

    if (!subscription) {
      logger.warn('Intento de baja de suscripción inexistente', { 
        requestId, 
        userId: session.user.id, 
        claseId, 
        fecha: fechaClase?.toISOString() || null 
      })
      return NextResponse.json({ error: 'No estás subscrito a esta clase' }, { status: 404 })
    }

    // Eliminar subscripción usando el ID directamente
    await prisma.claseSubscription.delete({
      where: {
        id: subscription.id,
      },
    })

    logger.info('Suscripción eliminada exitosamente', { 
      requestId, 
      userId: session.user.id, 
      claseId, 
      subscriptionId: subscription.id,
      fecha: fechaClase?.toISOString() || null,
      duration: Date.now() - startTime
    })

    return NextResponse.json({ message: 'Te has dado de baja correctamente' })
  } catch (error: any) {
    logger.error('Error al darse de baja de clase', error, { 
      requestId, 
      userId: (await getServerSession(authOptions))?.user?.id,
      duration: Date.now() - startTime,
      stack: error.stack
    })
    
    if (error.message?.includes('fecha') || error.message?.includes('ClaseSubscription.fecha')) {
      return NextResponse.json(
        { 
          error: 'Error de base de datos: La columna fecha no existe. Por favor, ejecuta la migración SQL_MIGRACION.sql',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Error al darse de baja',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

