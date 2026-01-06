import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

// GET - Obtener todos los suscriptores de una clase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo PROFESOR, ADMIN o ADMIN de escuela pueden ver suscriptores
    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
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

    // Obtener el usuario completo
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que la clase existe
    const clase = await prisma.clase.findUnique({
      where: { id: claseId },
      include: {
        profesor: true,
        escuela: true,
      },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario tiene acceso a esta clase
    // Si es PROFESOR, solo puede ver sus propias clases
    if (user.role === 'PROFESOR') {
      // Necesitamos verificar si el usuario es el profesor de esta clase
      // Como el User y Profesor son entidades separadas, necesitamos buscar por email
      const usuarioCompleto = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true }
      })

      if (usuarioCompleto?.email !== clase.profesor.email) {
        // Si no coincide por email, verificar por escuela
        if (user.escuelaId && clase.escuelaId !== user.escuelaId) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }
      }
    } else if (user.role === 'ADMIN' && user.escuelaId && clase.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener todas las suscripciones de la clase (solo para esta fecha específica si hay fecha)
    // Usar SQL raw para obtener todas las suscripciones, incluyendo las manuales (userId IS NULL)
    let subscriptionsRaw: Array<{
      id: string
      userId: string | null
      claseId: string
      fecha: Date | null
      nombre: string | null
      apellido: string | null
      dni: string | null
      email: string | null
      phone: string | null
      createdAt: Date
      user_email: string | null
      user_name: string | null
      user_apellido: string | null
      user_dni: string | null
      user_phone: string | null
    }>
    
    if (fechaClase) {
      // Cuando hay fecha específica, mostrar:
      // 1. Suscripciones con esa fecha específica
      // 2. Suscripciones con fecha = null (aplican a todas las semanas, incluyendo esta fecha)
      subscriptionsRaw = await prisma.$queryRaw`
        SELECT 
          cs.id,
          cs."userId",
          cs."claseId",
          cs.fecha,
          cs.nombre,
          cs.apellido,
          cs.dni,
          cs.email,
          cs.phone,
          cs."createdAt",
          u.email as user_email,
          u.name as user_name,
          u.apellido as user_apellido,
          u.dni as user_dni,
          u.phone as user_phone
        FROM "ClaseSubscription" cs
        LEFT JOIN "User" u ON cs."userId" = u.id
        WHERE cs."claseId" = ${claseId}::text 
          AND (cs.fecha = ${fechaClase}::timestamp OR cs.fecha IS NULL)
        ORDER BY cs."createdAt" DESC
      `
    } else {
      // Cuando no hay fecha específica, mostrar solo suscripciones con fecha = null
      subscriptionsRaw = await prisma.$queryRaw`
        SELECT 
          cs.id,
          cs."userId",
          cs."claseId",
          cs.fecha,
          cs.nombre,
          cs.apellido,
          cs.dni,
          cs.email,
          cs.phone,
          cs."createdAt",
          u.email as user_email,
          u.name as user_name,
          u.apellido as user_apellido,
          u.dni as user_dni,
          u.phone as user_phone
        FROM "ClaseSubscription" cs
        LEFT JOIN "User" u ON cs."userId" = u.id
        WHERE cs."claseId" = ${claseId}::text AND cs.fecha IS NULL
        ORDER BY cs."createdAt" DESC
      `
    }

    const suscriptores = subscriptionsRaw.map((sub) => ({
      id: sub.id,
      userId: sub.userId,
      // Si hay userId, usar datos del usuario, sino usar datos de la inscripción manual
      email: sub.userId ? (sub.user_email || null) : (sub.email || null),
      name: sub.userId ? (sub.user_name || null) : (sub.nombre || null),
      apellido: sub.userId ? (sub.user_apellido || null) : (sub.apellido || null),
      dni: sub.userId ? (sub.user_dni || null) : (sub.dni || null),
      phone: sub.userId ? (sub.user_phone || null) : (sub.phone || null),
      fechaInscripcion: sub.createdAt,
    }))

    return NextResponse.json({
      clase: {
        id: clase.id,
        titulo: clase.titulo,
        capacidad: clase.capacidad,
      },
      suscriptores: suscriptores,
      total: suscriptores.length,
    })
  } catch (error) {
    console.error('Error al obtener suscriptores:', error)
    return NextResponse.json(
      { error: 'Error al obtener suscriptores' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una suscripción de una clase
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo PROFESOR o ADMIN pueden eliminar suscripciones
    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    let claseId = params.id
    const body = await request.json()
    const { subscriptionId, userId, fecha } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'ID de suscripción requerido' },
        { status: 400 }
      )
    }

    // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
    if (claseId.includes('-')) {
      const partes = claseId.split('-')
      claseId = partes[0]
    }

    // Obtener el usuario completo
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que la suscripción existe y obtener información de la clase
    const subscription = await prisma.$queryRaw<Array<{
      id: string
      claseId: string
      userId: string | null
      fecha: Date | null
    }>>`
      SELECT id, "claseId", "userId", fecha
      FROM "ClaseSubscription"
      WHERE id = ${subscriptionId}::text
    `

    if (!subscription || subscription.length === 0) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    const sub = subscription[0]

    // Verificar que la clase existe y obtener información
    const clase = await prisma.clase.findUnique({
      where: { id: sub.claseId },
      include: {
        profesor: true,
        escuela: true,
      },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario tiene acceso a esta clase
    if (user.role === 'PROFESOR') {
      if (user.email !== clase.profesor.email) {
        if (user.escuelaId && clase.escuelaId !== user.escuelaId) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }
      }
    } else if (user.role === 'ADMIN' && user.escuelaId && clase.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Eliminar la suscripción usando SQL raw para evitar problemas con userId null
    await prisma.$executeRaw`
      DELETE FROM "ClaseSubscription"
      WHERE id = ${subscriptionId}::text
    `

    return NextResponse.json({
      message: 'Alumno eliminado correctamente',
    })
  } catch (error) {
    console.error('Error al eliminar suscripción:', error)
    return NextResponse.json(
      { error: 'Error al eliminar suscripción' },
      { status: 500 }
    )
  }
}

