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
    // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
    claseId = claseId.includes('-') ? claseId.split('-')[0] : claseId

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

    // Obtener todas las suscripciones de la clase
    const subscriptions = await prisma.claseSubscription.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      clase: {
        id: clase.id,
        titulo: clase.titulo,
        capacidad: clase.capacidad,
      },
      suscriptores: subscriptions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        email: sub.user.email,
        name: sub.user.name,
        apellido: sub.user.apellido,
        dni: sub.user.dni,
        phone: sub.user.phone,
        fechaInscripcion: sub.createdAt,
      })),
      total: subscriptions.length,
    })
  } catch (error) {
    console.error('Error al obtener suscriptores:', error)
    return NextResponse.json(
      { error: 'Error al obtener suscriptores' },
      { status: 500 }
    )
  }
}

