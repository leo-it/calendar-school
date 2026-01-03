import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

// GET - Obtener todas las invitaciones (ADMIN o PROFESOR admin de su escuela)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, escuelaId: true, esAdminEscuela: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si es ADMIN, mostrar todas. Si es PROFESOR admin, solo las de su escuela
    const whereClause: any = {}
    if (user.role === 'PROFESOR' && user.esAdminEscuela && user.escuelaId) {
      whereClause.escuelaId = user.escuelaId
    }

    const invitaciones = await prisma.invitacionProfesor.findMany({
      where: whereClause,
      include: {
        escuela: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(invitaciones)
  } catch (error: any) {
    console.error('Error al obtener invitaciones:', error)
    return NextResponse.json(
      { 
        error: 'Error al obtener invitaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Crear una nueva invitación (ADMIN o PROFESOR admin de su escuela)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que sea ADMIN o PROFESOR admin de su escuela
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, escuelaId: true, esAdminEscuela: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const puedeCrearInvitacion = 
      user.role === 'ADMIN' || 
      (user.role === 'PROFESOR' && user.esAdminEscuela && user.escuelaId)

    if (!puedeCrearInvitacion) {
      return NextResponse.json({ 
        error: 'No autorizado. Solo los administradores y profesores administradores de escuela pueden crear invitaciones.' 
      }, { status: 403 })
    }

    const body = await request.json()
    let { escuelaId, expiraEn } = body

    // Si es PROFESOR admin, usar su escuela automáticamente
    if (user.role === 'PROFESOR' && user.esAdminEscuela && user.escuelaId) {
      escuelaId = user.escuelaId
    }

    // Validar escuela si se proporciona
    if (escuelaId) {
      const escuela = await prisma.escuela.findUnique({
        where: { id: escuelaId }
      })

      if (!escuela) {
        return NextResponse.json(
          { error: 'La escuela especificada no existe' },
          { status: 400 }
        )
      }

      // Si es PROFESOR admin, verificar que la escuela sea la suya
      if (user.role === 'PROFESOR' && user.esAdminEscuela && escuelaId !== user.escuelaId) {
        return NextResponse.json(
          { error: 'Solo puedes crear invitaciones para tu propia escuela' },
          { status: 403 }
        )
      }
    }

    // Generar código único (8 caracteres alfanuméricos)
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase()

    // Calcular fecha de expiración (30 días por defecto)
    const fechaExpiracion = expiraEn 
      ? new Date(expiraEn) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días

    const invitacion = await prisma.invitacionProfesor.create({
      data: {
        codigo,
        escuelaId: escuelaId || null,
        expiraEn: fechaExpiracion,
        creadoPor: session.user.id,
      },
      include: {
        escuela: true,
      },
    })

    return NextResponse.json(invitacion, { status: 201 })
  } catch (error) {
    console.error('Error al crear invitación:', error)
    return NextResponse.json(
      { error: 'Error al crear invitación' },
      { status: 500 }
    )
  }
}

