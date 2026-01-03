import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

// GET - Obtener todas las escuelas (público para registro, pero filtrado para otros)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Si hay sesión, filtrar por escuela del usuario si no es ADMIN
    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { escuelaId: true, role: true }
      })

      if (user && user.role !== 'ADMIN' && user.escuelaId) {
        // Usuarios no-ADMIN solo ven su escuela
        const escuela = await prisma.escuela.findUnique({
          where: { id: user.escuelaId }
        })
        return NextResponse.json(escuela ? [escuela] : [])
      }
    }

    // Para registro público o ADMIN, devolver todas las escuelas activas
    const escuelas = await prisma.escuela.findMany({
      where: {
        activa: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    return NextResponse.json(escuelas)
  } catch (error) {
    console.error('Error al obtener escuelas:', error)
    return NextResponse.json(
      { error: 'Error al obtener escuelas' },
      { status: 500 }
    )
  }
}

// POST - Crear una nueva escuela (solo ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, direccion, telefono, email } = body

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre de la escuela es requerido' },
        { status: 400 }
      )
    }

    const escuela = await prisma.escuela.create({
      data: {
        nombre,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email || null,
      },
    })

    return NextResponse.json(escuela, { status: 201 })
  } catch (error) {
    console.error('Error al crear escuela:', error)
    return NextResponse.json(
      { error: 'Error al crear escuela' },
      { status: 500 }
    )
  }
}






