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

    // Verificar que la clase existe
    const clase = await prisma.clase.findUnique({
      where: { id: claseId },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    // Crear o verificar subscripción (con fecha específica)
    const subscription = await prisma.claseSubscription.upsert({
      where: {
        userId_claseId_fecha: {
          userId: session.user.id,
          claseId: claseId,
          fecha: fechaClase as any, // Prisma acepta Date | null pero TypeScript necesita el cast
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        claseId: claseId,
        fecha: fechaClase,
      },
    })

    return NextResponse.json(subscription)
  } catch (error: any) {
    console.error('Error al subscribirse a clase:', error)
    
    // Proporcionar mensajes de error más específicos
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya estás inscrito en esta clase para esta fecha' },
        { status: 400 }
      )
    }
    
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
        error: 'Error al subscribirse',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}



