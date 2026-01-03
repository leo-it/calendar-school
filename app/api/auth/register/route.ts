import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, apellido, dni, role, phone, escuelaId, codigoInvitacion, nombreEscuela } = body

    // Validaciones
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Si intenta registrarse como PROFESOR
    let invitacionValida = null
    let escuelaFinalId = escuelaId
    let esAdminEscuela = false

    if (role === 'PROFESOR') {
      // Si proporciona nombre de escuela, es el primer profesor (admin de la escuela)
      if (nombreEscuela) {
        // Normalizar el nombre de la escuela para buscar si ya existe
        const nombreNormalizado = nombreEscuela.trim().toLowerCase().replace(/\s+/g, '')
        
        // Buscar si ya existe una escuela con ese nombre normalizado
        const escuelasExistentes = await prisma.escuela.findMany({
          where: { activa: true }
        })
        
        const escuelaExistente = escuelasExistentes.find((e: { nombre: string }) => 
          e.nombre.toLowerCase().replace(/\s+/g, '') === nombreNormalizado
        )

        if (escuelaExistente) {
          return NextResponse.json(
            { error: 'Ya existe una escuela con ese nombre. Si quieres unirte a ella, usa un código de invitación.' },
            { status: 400 }
          )
        }

        // Crear nueva escuela
        const nuevaEscuela = await prisma.escuela.create({
          data: {
            nombre: nombreEscuela.trim(),
            activa: true,
          }
        })
        
        escuelaFinalId = nuevaEscuela.id
        esAdminEscuela = true // Este profesor será el admin de la escuela
      } else if (codigoInvitacion) {
        // Si no proporciona nombre pero sí código, es un profesor invitado
        // Validar el código de invitación
        const invitacion = await prisma.invitacionProfesor.findUnique({
          where: { codigo: codigoInvitacion },
          include: { escuela: true },
        })

        if (!invitacion) {
          return NextResponse.json(
            { error: 'Código de invitación inválido' },
            { status: 400 }
          )
        }

        if (invitacion.usado) {
          return NextResponse.json(
            { error: 'Este código de invitación ya fue utilizado' },
            { status: 400 }
          )
        }

        if (invitacion.expiraEn && new Date() > invitacion.expiraEn) {
          return NextResponse.json(
            { error: 'Este código de invitación ha expirado' },
            { status: 400 }
          )
        }

        invitacionValida = invitacion
        // Si la invitación tiene una escuela asignada, usar esa
        if (invitacion.escuelaId) {
          escuelaFinalId = invitacion.escuelaId
        } else {
          return NextResponse.json(
            { error: 'El código de invitación no está asociado a ninguna escuela' },
            { status: 400 }
          )
        }
      } else {
        // Profesor debe proporcionar nombre de escuela o código de invitación
        return NextResponse.json(
          { error: 'Para registrarse como profesor, debe proporcionar el nombre de su escuela o un código de invitación' },
          { status: 400 }
        )
      }
    }

    // Validar que la escuela existe si se proporciona
    if (escuelaFinalId) {
      const escuela = await prisma.escuela.findUnique({
        where: { id: escuelaFinalId }
      })

      if (!escuela) {
        return NextResponse.json(
          { error: 'La escuela especificada no existe' },
          { status: 400 }
        )
      }
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Usar transacción para crear usuario y profesor de forma atómica
    const result = await prisma.$transaction(async (tx) => {
      // Preparar datos del usuario
      const userData: any = {
        email,
        password: hashedPassword,
        name: name || null,
        apellido: apellido || null,
        dni: dni || null,
        role: role || 'ESTUDIANTE',
        phone: phone || null,
        esAdminEscuela: esAdminEscuela,
      }

      // Agregar escuelaId si existe
      if (escuelaFinalId) {
        userData.escuelaId = escuelaFinalId
      }

      // Crear usuario
      const user = await tx.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          escuelaId: true,
          esAdminEscuela: true,
        }
      })

      // Si es PROFESOR, crear también el registro en la tabla Profesor
      if (role === 'PROFESOR') {
        // Verificar si ya existe un profesor con ese email
        const profesorExistente = await tx.profesor.findUnique({
          where: { email: email }
        })

        if (!profesorExistente) {
          await tx.profesor.create({
            data: {
              name: name || email,
              email: email,
              phone: phone || null,
              dni: dni || null,
            }
          })
        }
      }

      // Marcar la invitación como usada si existe
      if (invitacionValida) {
        await tx.invitacionProfesor.update({
          where: { id: invitacionValida.id },
          data: {
            usado: true,
            usadoPor: user.id,
            usadoEn: new Date(),
          },
        })
      }

      return user
    })

    const user = result

    return NextResponse.json(
      { 
        message: 'Usuario registrado exitosamente',
        user 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error al registrar usuario:', error)
    return NextResponse.json(
      { 
        error: 'Error al registrar usuario',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

