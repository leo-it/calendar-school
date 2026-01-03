import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// POST - Crear un estudiante (solo para PROFESOR o ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo PROFESOR o ADMIN pueden crear estudiantes
    if (session.user.role !== 'PROFESOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, apellido, dni, claseId } = body

    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      )
    }

    // Obtener el usuario completo
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!user.escuelaId) {
      return NextResponse.json(
        { error: 'Debe tener una escuela asignada' },
        { status: 403 }
      )
    }

    // Si se proporciona claseId, verificar que el profesor tenga acceso
    if (claseId) {
      const claseIdReal = claseId.includes('-') ? claseId.split('-')[0] : claseId
      const clase = await prisma.clase.findUnique({
        where: { id: claseIdReal },
        include: { profesor: true }
      })

      if (!clase) {
        return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
      }

      // Verificar acceso del profesor a la clase
      if (user.role === 'PROFESOR') {
        const usuarioCompleto = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true }
        })

        if (usuarioCompleto?.email !== clase.profesor.email) {
          if (clase.escuelaId !== user.escuelaId) {
            return NextResponse.json({ error: 'No autorizado para esta clase' }, { status: 403 })
          }
        }
      } else if (user.role === 'ADMIN' && user.escuelaId && clase.escuelaId !== user.escuelaId) {
        return NextResponse.json({ error: 'No autorizado para esta clase' }, { status: 403 })
      }
    }

    // Generar email único temporal (usando timestamp + random)
    const emailTemporal = `estudiante.${Date.now()}.${crypto.randomBytes(4).toString('hex')}@temp.almanaque.local`
    
    // Generar contraseña temporal aleatoria
    const passwordTemporal = crypto.randomBytes(8).toString('hex')
    const hashedPassword = await bcrypt.hash(passwordTemporal, 10)

    // Crear el estudiante
    const estudiante = await prisma.user.create({
      data: {
        email: emailTemporal,
        password: hashedPassword,
        name: nombre.trim(),
        apellido: apellido?.trim() || null,
        dni: dni?.trim() || null,
        role: 'ESTUDIANTE',
        escuelaId: user.escuelaId,
      },
      select: {
        id: true,
        name: true,
        apellido: true,
        dni: true,
        email: true,
        escuelaId: true,
      }
    })

    // Si se proporciona claseId, inscribir al estudiante automáticamente
    if (claseId) {
      const claseIdReal = claseId.includes('-') ? claseId.split('-')[0] : claseId
      
      // Verificar capacidad
      const count = await prisma.claseSubscription.count({
        where: { claseId: claseIdReal },
      })

      const clase = await prisma.clase.findUnique({
        where: { id: claseIdReal },
        select: { capacidad: true }
      })

      if (clase && count < clase.capacidad) {
        await prisma.claseSubscription.create({
          data: {
            userId: estudiante.id,
            claseId: claseIdReal,
          },
        })
      }
    }

    return NextResponse.json({
      message: 'Estudiante creado exitosamente',
      estudiante: {
        id: estudiante.id,
        name: estudiante.name,
        apellido: estudiante.apellido,
        dni: estudiante.dni,
        email: estudiante.email,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear estudiante:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese DNI o email' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear estudiante' },
      { status: 500 }
    )
  }
}

