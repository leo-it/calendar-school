import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

// Función helper para normalizar fechas a medianoche UTC
function normalizarFecha(fecha: string | Date | null): Date | null {
  if (!fecha) return null
  
  let fechaObj: Date
  if (typeof fecha === 'string') {
    // Si es string "YYYY-MM-DD", crear fecha en UTC a medianoche
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      fechaObj = new Date(fecha + 'T00:00:00.000Z')
    } else {
      fechaObj = new Date(fecha)
    }
  } else {
    fechaObj = fecha
  }
  
  if (isNaN(fechaObj.getTime())) {
    return null
  }
  
  // Normalizar a medianoche UTC
  const fechaNormalizada = new Date(Date.UTC(
    fechaObj.getUTCFullYear(),
    fechaObj.getUTCMonth(),
    fechaObj.getUTCDate(),
    0, 0, 0, 0
  ))
  
  return fechaNormalizada
}

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
    // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
    let fechaClase: Date | null = null
    if (claseId.includes('-')) {
      const partes = claseId.split('-')
      claseId = partes[0]
      // Intentar parsear la fecha del formato "id-YYYY-MM-DD"
      if (partes.length >= 4) {
        const fechaStr = `${partes[1]}-${partes[2]}-${partes[3]}`
        fechaClase = normalizarFecha(fechaStr)
      }
    }

    const body = await request.json()
    const { userId, fecha, nombre, apellido, dni, email, phone } = body
    
    // Normalizar valores: convertir cadenas vacías a null
    const dniNormalizado = dni && dni.trim() !== '' ? dni.trim() : null
    const emailNormalizado = email && email.trim() !== '' ? email.trim() : null
    const phoneNormalizado = phone && phone.trim() !== '' ? phone.trim() : null
    
    // Si se proporciona fecha explícitamente, usarla y normalizarla
    if (fecha) {
      fechaClase = normalizarFecha(fecha)
      if (!fechaClase) {
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      }
    }

    // Validar que se proporcione userId O datos del alumno nuevo
    const nombreNormalizado = nombre && nombre.trim() !== '' ? nombre.trim() : null
    const apellidoNormalizado = apellido && apellido.trim() !== '' ? apellido.trim() : null
    
    if (!userId && (!nombreNormalizado || !apellidoNormalizado)) {
      return NextResponse.json(
        { error: 'Debe proporcionar userId o nombre y apellido del alumno' },
        { status: 400 }
      )
    }

    // Si se proporciona userId, validar que el usuario existe
    // Si no se proporciona userId, es una inscripción manual sin usuario registrado
    let usuarioAAñadir: any = null
    if (userId) {
      usuarioAAñadir = await prisma.user.findUnique({
        where: { id: userId },
        select: { escuelaId: true, email: true, name: true }
      })

      if (!usuarioAAñadir) {
        return NextResponse.json({ error: 'Usuario a añadir no encontrado' }, { status: 404 })
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

    // Verificar que pertenece a la misma escuela (si el profesor/admin tiene escuela y hay userId)
    if (userId && user.escuelaId && usuarioAAñadir.escuelaId !== user.escuelaId) {
      return NextResponse.json(
        { error: 'El usuario debe pertenecer a la misma escuela' },
        { status: 403 }
      )
    }

    // Verificar capacidad (solo para esta fecha específica si hay fecha)
    // Usar SQL raw para comparar correctamente las fechas por día
    let count: number
    if (fechaClase) {
      // Contar suscripciones con esta fecha específica O fecha null (aplican a todas las semanas)
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM "ClaseSubscription"
        WHERE "claseId" = ${claseId}::text 
          AND (
            ("fecha" IS NOT NULL AND DATE("fecha") = DATE(${fechaClase}::timestamp))
            OR "fecha" IS NULL
          )
      `
      count = Number(result[0]?.count || 0)
    } else {
      // Contar solo suscripciones con fecha null
      count = await prisma.claseSubscription.count({
        where: {
          claseId: claseId,
          fecha: null,
        },
      })
    }

    if (count >= clase.capacidad) {
      return NextResponse.json(
        { error: 'La clase ha alcanzado su capacidad máxima' },
        { status: 400 }
      )
    }

    // Crear o verificar suscripción (con fecha específica)
    let subscription
    
    if (userId) {
      // Inscripción de usuario existente
      // Si fecha es null, no podemos usar el constraint único directamente
      if (fechaClase === null) {
        // Buscar si ya existe
        const existente = await prisma.claseSubscription.findFirst({
          where: {
            userId: userId,
            claseId: claseId,
            fecha: null,
          },
        })

        if (existente) {
          // Obtener el usuario para incluir en la respuesta
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              name: true,
              apellido: true,
              dni: true,
              phone: true,
            },
          })
          subscription = { ...existente, user } as any
        } else {
          subscription = await prisma.claseSubscription.create({
            data: {
              userId: userId,
              claseId: claseId,
              fecha: null,
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
          }) as any
        }
      } else {
        // Si hay fecha, usar upsert normalmente
        subscription = await prisma.claseSubscription.upsert({
          where: {
            userId_claseId_fecha: {
              userId: userId,
              claseId: claseId,
              fecha: fechaClase,
            },
          },
          update: {},
          create: {
            userId: userId,
            claseId: claseId,
            fecha: fechaClase,
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
      }

      return NextResponse.json({
        message: 'Usuario añadido correctamente',
        subscription: {
          id: subscription.id,
          userId: subscription.userId,
          email: subscription.user?.email || null,
          name: subscription.user?.name || null,
          apellido: subscription.user?.apellido || null,
          dni: subscription.user?.dni || null,
          phone: subscription.user?.phone || null,
          fechaInscripcion: subscription.createdAt,
        },
      })
    } else {
      // Inscripción manual sin usuario registrado
      // Validar que no exista una inscripción duplicada (mismo nombre, apellido, dni, clase, fecha)
      const emailFinal = emailNormalizado || '-'
      
      // Verificar si ya existe una inscripción manual similar
      // Usar SQL raw para buscar registros donde userId IS NULL
      // Construir la consulta condicionalmente según si dni es null o no
      let existeInscripcion: Array<{ id: string }>
      
      if (dniNormalizado) {
        // Si dni tiene valor, buscar por dni específico
        existeInscripcion = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "ClaseSubscription"
          WHERE "claseId" = ${claseId}
            AND "nombre" = ${nombreNormalizado}
            AND "apellido" = ${apellidoNormalizado}
            AND (
              (${fechaClase} IS NULL AND "fecha" IS NULL)
              OR (${fechaClase} IS NOT NULL AND "fecha" IS NOT NULL AND DATE("fecha") = DATE(${fechaClase}::timestamp))
            )
            AND "dni" = ${dniNormalizado}
            AND "userId" IS NULL
          LIMIT 1
        `
      } else {
        // Si dni es null, buscar registros donde dni también es null
        existeInscripcion = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "ClaseSubscription"
          WHERE "claseId" = ${claseId}
            AND "nombre" = ${nombreNormalizado}
            AND "apellido" = ${apellidoNormalizado}
            AND (
              (${fechaClase} IS NULL AND "fecha" IS NULL)
              OR (${fechaClase} IS NOT NULL AND "fecha" IS NOT NULL AND DATE("fecha") = DATE(${fechaClase}::timestamp))
            )
            AND "dni" IS NULL
            AND "userId" IS NULL
          LIMIT 1
        `
      }

      if (existeInscripcion && existeInscripcion.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe una inscripción para este alumno en esta clase' },
          { status: 400 }
        )
      }

      // Usar create sin incluir la relación user cuando userId es null
      // Construir el objeto data explícitamente para evitar problemas con Prisma
      const dataToCreate: any = {
        userId: null,
        claseId: claseId,
        fecha: fechaClase,
        nombre: nombreNormalizado,
        apellido: apellidoNormalizado,
        dni: dniNormalizado,
        email: emailFinal,
        phone: phoneNormalizado,
      }
      
      // Intentar crear usando create, pero si falla, usar SQL raw
      try {
        subscription = await prisma.claseSubscription.create({
          data: dataToCreate,
        })
      } catch (createError: any) {
        // Si Prisma requiere la relación user, usar SQL raw
        if (createError.message?.includes('user') || createError.message?.includes('Argument')) {
          // Generar un ID similar a CUID (25 caracteres, empezando con 'c')
          const generateId = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
            let id = 'c'
            for (let i = 0; i < 24; i++) {
              id += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return id
          }
          
          const newId = generateId()
          
          // Usar SQL raw para insertar directamente con ID generado
          await prisma.$executeRaw`
            INSERT INTO "ClaseSubscription" (
              "id",
              "userId",
              "claseId",
              "fecha",
              "nombre",
              "apellido",
              "dni",
              "email",
              "phone",
              "createdAt"
            )
            VALUES (
              ${newId}::text,
              NULL,
              ${claseId}::text,
              ${fechaClase}::timestamp,
              ${nombreNormalizado}::text,
              ${apellidoNormalizado}::text,
              ${dniNormalizado}::text,
              ${emailFinal}::text,
              ${phoneNormalizado}::text,
              NOW()
            )
          `
          
          // Obtener el registro recién creado usando SQL raw para evitar problemas con tipos
          const result = await prisma.$queryRaw<Array<{
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
          }>>`
            SELECT 
              id,
              "userId",
              "claseId",
              fecha,
              nombre,
              apellido,
              dni,
              email,
              phone,
              "createdAt"
            FROM "ClaseSubscription"
            WHERE id = ${newId}::text
          `
          
          if (!result || result.length === 0) {
            throw new Error('Error al crear la inscripción')
          }
          
          // Construir el objeto subscription desde el resultado SQL
          subscription = {
            id: result[0].id,
            userId: result[0].userId,
            claseId: result[0].claseId,
            fecha: result[0].fecha,
            nombre: result[0].nombre,
            apellido: result[0].apellido,
            dni: result[0].dni,
            email: result[0].email,
            phone: result[0].phone,
            createdAt: result[0].createdAt,
          } as any
        } else {
          throw createError
        }
      }

      return NextResponse.json({
        message: 'Alumno añadido correctamente',
        subscription: {
          id: subscription.id,
          userId: null,
          email: (subscription as any).email || null,
          name: (subscription as any).nombre || null,
          apellido: (subscription as any).apellido || null,
          dni: (subscription as any).dni || null,
          phone: (subscription as any).phone || null,
          fechaInscripcion: subscription.createdAt,
        },
      })
    }
  } catch (error: any) {
    console.error('Error al añadir usuario manualmente:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El usuario ya está inscrito en esta clase' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Error al añadir usuario',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

