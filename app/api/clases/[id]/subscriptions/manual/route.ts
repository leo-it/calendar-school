import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

// POST - Añadir manualmente un usuario a una clase
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo PROFESOR, ADMIN o ADMIN de escuela pueden añadir suscriptores manualmente
    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    let claseId = params.id
    // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
    claseId = claseId.includes('-') ? claseId.split('-')[0] : claseId

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
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
    if (user.role === 'PROFESOR') {
      const usuarioCompleto = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true }
      })

      if (usuarioCompleto?.email !== clase.profesor.email) {
        if (user.escuelaId && clase.escuelaId !== user.escuelaId) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }
      }
    } else if (user.role === 'ADMIN' && user.escuelaId && clase.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verificar que el usuario a añadir existe y pertenece a la misma escuela
    const usuarioAAñadir = await prisma.user.findUnique({
      where: { id: userId },
      select: { escuelaId: true, email: true, name: true }
    })

    if (!usuarioAAñadir) {
      return NextResponse.json({ error: 'Usuario a añadir no encontrado' }, { status: 404 })
    }

    // Verificar que pertenece a la misma escuela (si el profesor/admin tiene escuela)
    if (user.escuelaId && usuarioAAñadir.escuelaId !== user.escuelaId) {
      return NextResponse.json(
        { error: 'El usuario debe pertenecer a la misma escuela' },
        { status: 403 }
      )
    }

    // Verificar capacidad
    const count = await prisma.claseSubscription.count({
      where: { claseId: claseId },
    })

    if (count >= clase.capacidad) {
      return NextResponse.json(
        { error: 'La clase ha alcanzado su capacidad máxima' },
        { status: 400 }
      )
    }

    // Crear o verificar suscripción
    const subscription = await prisma.claseSubscription.upsert({
      where: {
        userId_claseId: {
          userId: userId,
          claseId: claseId,
        },
      },
      update: {},
      create: {
        userId: userId,
        claseId: claseId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            apellido: true,
            dni: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Usuario añadido correctamente',
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        email: subscription.user.email,
        name: subscription.user.name,
        apellido: subscription.user.apellido,
        dni: subscription.user.dni,
        phone: subscription.user.phone,
        fechaInscripcion: subscription.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Error al añadir usuario manualmente:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El usuario ya está inscrito en esta clase' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al añadir usuario' },
      { status: 500 }
    )
  }
}

