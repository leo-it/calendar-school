import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener una escuela específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const escuela = await prisma.escuela.findUnique({
      where: { id: params.id },
      include: {
        usuarios: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        clases: {
          include: {
            profesor: true,
          },
        },
      },
    })

    if (!escuela) {
      return NextResponse.json({ error: 'Escuela no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario tenga acceso (misma escuela o es ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (user && user.role !== 'ADMIN' && user.escuelaId !== params.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(escuela)
  } catch (error) {
    console.error('Error al obtener escuela:', error)
    return NextResponse.json(
      { error: 'Error al obtener escuela' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar una escuela (ADMIN o profesor admin de la escuela)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos: ADMIN o profesor admin de la escuela
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true, esAdminEscuela: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const puedeEditar = user.role === 'ADMIN' || (user.role === 'PROFESOR' && user.esAdminEscuela && user.escuelaId === params.id)
    
    if (!puedeEditar) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      nombre, 
      direccion, 
      telefono, 
      email, 
      instagram,
      facebook,
      whatsapp,
      web,
      activa 
    } = body

    // Solo ADMIN puede cambiar nombre y activa
    const updateData: any = {}
    if (user.role === 'ADMIN') {
      if (nombre !== undefined) updateData.nombre = nombre
      if (activa !== undefined) updateData.activa = activa
    }
    
    // Todos los campos de contacto pueden ser editados
    updateData.direccion = direccion !== undefined ? (direccion || null) : undefined
    updateData.telefono = telefono !== undefined ? (telefono || null) : undefined
    updateData.email = email !== undefined ? (email || null) : undefined
    updateData.instagram = instagram !== undefined ? (instagram || null) : undefined
    updateData.facebook = facebook !== undefined ? (facebook || null) : undefined
    updateData.whatsapp = whatsapp !== undefined ? (whatsapp || null) : undefined
    updateData.web = web !== undefined ? (web || null) : undefined

    // Filtrar campos undefined
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    )

    const escuela = await prisma.escuela.update({
      where: { id: params.id },
      data: cleanData,
    })

    return NextResponse.json(escuela)
  } catch (error) {
    console.error('Error al actualizar escuela:', error)
    return NextResponse.json(
      { error: 'Error al actualizar escuela' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una escuela (solo ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.escuela.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Escuela eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar escuela:', error)
    return NextResponse.json(
      { error: 'Error al eliminar escuela' },
      { status: 500 }
    )
  }
}






