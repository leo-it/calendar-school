import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener una clase específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el usuario completo para acceder a su escuelaId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const clase = await prisma.clase.findUnique({
      where: { id: params.id },
      include: {
        profesor: true,
        escuela: true,
      },
    })

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario tenga acceso a esta clase (misma escuela o es ADMIN)
    if (user.role !== 'ADMIN' && user.escuelaId && clase.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado para ver esta clase' }, { status: 403 })
    }

    return NextResponse.json(clase)
  } catch (error) {
    console.error('Error al obtener clase:', error)
    return NextResponse.json(
      { error: 'Error al obtener clase' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar una clase
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PROFESOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el usuario completo para acceder a su escuelaId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que la clase existe y pertenece a la escuela del usuario (si no es ADMIN)
    const claseExistente = await prisma.clase.findUnique({
      where: { id: params.id },
      select: { escuelaId: true }
    })

    if (!claseExistente) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.escuelaId && claseExistente.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado para editar esta clase' }, { status: 403 })
    }

    const body = await request.json()
    const {
      titulo,
      descripcion,
      diaSemana,
      horaInicio,
      horaFin,
      nivel,
      estilo,
      lugar,
      capacidad,
      profesorId,
      fechaInicio,
      fechaFin,
      activa,
      escuelaId, // Solo para ADMIN
    } = body

    // Validar y convertir diaSemana
    const diaSemanaNum = typeof diaSemana === 'string' ? parseInt(diaSemana, 10) : diaSemana
    if (isNaN(diaSemanaNum) || diaSemanaNum < 0 || diaSemanaNum > 6) {
      return NextResponse.json(
        { error: 'Día de la semana inválido. Debe ser un número entre 0 y 6' },
        { status: 400 }
      )
    }

    // Si el estilo está vacío, usar el título
    const estiloFinal = (estilo && estilo.trim() !== '') ? estilo.trim() : titulo.trim()

    // Preparar datos de actualización
    const updateData: any = {
      titulo,
      descripcion,
      diaSemana: diaSemanaNum,
      horaInicio,
      horaFin,
      nivel,
      estilo: estiloFinal,
      lugar,
      capacidad: parseInt(capacidad),
      profesorId,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      activa: activa !== undefined ? activa : true,
    }

    // Solo los ADMIN pueden cambiar la escuela
    if (session.user.role === 'ADMIN' && escuelaId) {
      // Validar que la nueva escuela existe
      const nuevaEscuela = await prisma.escuela.findUnique({
        where: { id: escuelaId }
      })
      if (!nuevaEscuela) {
        return NextResponse.json(
          { error: 'La escuela especificada no existe' },
          { status: 400 }
        )
      }
      updateData.escuelaId = escuelaId
    } else {
      // Para PROFESOR, asegurar que la escuela no cambie (usar la de la clase existente)
      updateData.escuelaId = claseExistente.escuelaId
    }

    const clase = await prisma.clase.update({
      where: { id: params.id },
      data: updateData,
      include: {
        profesor: true,
        escuela: true,
      },
    })

    return NextResponse.json(clase)
  } catch (error) {
    console.error('Error al actualizar clase:', error)
    return NextResponse.json(
      { error: 'Error al actualizar clase' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una clase
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PROFESOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el usuario completo para acceder a su escuelaId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que la clase existe y pertenece a la escuela del usuario (si no es ADMIN)
    const claseExistente = await prisma.clase.findUnique({
      where: { id: params.id },
      select: { escuelaId: true }
    })

    if (!claseExistente) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.escuelaId && claseExistente.escuelaId !== user.escuelaId) {
      return NextResponse.json({ error: 'No autorizado para eliminar esta clase' }, { status: 403 })
    }

    await prisma.clase.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Clase eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar clase:', error)
    return NextResponse.json(
      { error: 'Error al eliminar clase' },
      { status: 500 }
    )
  }
}



