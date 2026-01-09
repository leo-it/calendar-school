import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClaseSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const inicio = searchParams.get('inicio')
    const fin = searchParams.get('fin')

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas de inicio y fin requeridas' }, { status: 400 })
    }

    // Función helper para parsear fecha YYYY-MM-DD como fecha local (no UTC)
    const parseFechaLocal = (fechaStr: string): Date => {
      // Si viene como YYYY-MM-DD, crear fecha en hora local
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
        const [año, mes, dia] = fechaStr.split('-').map(Number)
        return new Date(año, mes - 1, dia, 0, 0, 0, 0)
      }
      // Si viene como ISO string, parsear normalmente
      return new Date(fechaStr)
    }

    // Normalizar fechas usando hora local para evitar problemas de zona horaria
    const fechaInicio = parseFechaLocal(inicio)
    fechaInicio.setHours(0, 0, 0, 0)
    const fechaFin = parseFechaLocal(fin)
    fechaFin.setHours(23, 59, 59, 999)

    // Obtener el usuario completo para acceder a su escuelaId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { escuelaId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Construir el filtro de where
    const whereClause: any = {
      activa: true,
    }

    // Filtrar por escuela del usuario
    // Solo los ADMIN sin escuela pueden ver todas las clases
    // ESTUDIANTE y PROFESOR SIEMPRE deben ver solo clases de su escuela
    if (user.role === 'ADMIN' && !user.escuelaId) {
      // ADMIN sin escuela asignada puede ver todas las clases
      // No agregar filtro de escuela
    } else {
      // Para ESTUDIANTE, PROFESOR y ADMIN con escuela: filtrar por escuela
      if (!user.escuelaId) {
        // Usuario sin escuela asignada no puede ver clases
        return NextResponse.json(
          { error: 'Debe tener una escuela asignada para ver clases' },
          { status: 403 }
        )
      }
      // Aplicar filtro de escuela (obligatorio para ESTUDIANTE y PROFESOR)
      whereClause.escuelaId = user.escuelaId
    }

    // Obtener todas las clases recurrentes activas (filtradas por escuela si aplica)
    const clasesRecurrentes = await prisma.clase.findMany({
      where: whereClause,
      include: {
        profesor: true,
        escuela: true,
      },
    })

    // Generar ocurrencias de clases para el rango de fechas
    const clasesGeneradas: any[] = []
    const fechaActual = new Date(fechaInicio)
    fechaActual.setHours(0, 0, 0, 0)
    
    // Crear una fecha límite normalizada para la comparación
    const fechaFinNormalizada = new Date(fechaFin)
    fechaFinNormalizada.setHours(23, 59, 59, 999)

    while (fechaActual <= fechaFinNormalizada) {
      // Usar getDay() con hora local para obtener el día correcto
      // 0 = Domingo, 1 = Lunes, etc.
      const diaSemana = fechaActual.getDay()
      
      // Buscar clases que coincidan con este día de la semana
      const clasesDelDia = clasesRecurrentes.filter((clase: typeof clasesRecurrentes[0]) => {
        // Verificar si hay restricciones de fecha
        if (clase.fechaInicio) {
          const fechaInicioClase = new Date(clase.fechaInicio)
          fechaInicioClase.setHours(0, 0, 0, 0)
          if (fechaActual < fechaInicioClase) return false
        }
        if (clase.fechaFin) {
          const fechaFinClase = new Date(clase.fechaFin)
          fechaFinClase.setHours(23, 59, 59, 999)
          if (fechaActual > fechaFinClase) return false
        }
        
        return clase.diaSemana === diaSemana
      })

      // Generar una ocurrencia para cada clase del día
      clasesDelDia.forEach((clase: typeof clasesRecurrentes[0]) => {
        const fechaClase = new Date(fechaActual)
        fechaClase.setHours(0, 0, 0, 0)
        // Generar ID usando la fecha en formato YYYY-MM-DD
        const año = fechaClase.getFullYear()
        const mes = String(fechaClase.getMonth() + 1).padStart(2, '0')
        const dia = String(fechaClase.getDate()).padStart(2, '0')
        const fechaStr = `${año}-${mes}-${dia}`
        clasesGeneradas.push({
          ...clase,
          fecha: fechaClase,
          id: `${clase.id}-${fechaStr}`, // ID único para esta ocurrencia
        })
      })

      // Avanzar al siguiente día en hora local
      fechaActual.setDate(fechaActual.getDate() + 1)
    }

    // Ordenar por fecha y hora
    clasesGeneradas.sort((a, b) => {
      const fechaA = new Date(a.fecha)
      const fechaB = new Date(b.fecha)
      if (fechaA.getTime() !== fechaB.getTime()) {
        return fechaA.getTime() - fechaB.getTime()
      }
      return a.horaInicio.localeCompare(b.horaInicio)
    })

    return NextResponse.json(clasesGeneradas)
  } catch (error) {
    console.error('Error al obtener clases:', error)
    return NextResponse.json(
      { error: 'Error al obtener clases' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    logger.info('Iniciando creación de clase', { requestId, action: 'create_clase_start' })
    
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN' && session.user.role !== 'PROFESOR') {
      logger.warn('Intento de crear clase sin autorización', { requestId, userId: session?.user?.id, role: session?.user?.role })
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

    const body = await request.json()
    logger.debug('Datos recibidos para crear clase', { requestId, body: { ...body, profesorNombre: body.profesorNombre?.substring(0, 50) } })
    
    // Validar con Zod
    const validationResult = createClaseSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Error de validación al crear clase', { requestId, validationErrors: validationResult.error.errors })
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

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
      profesorNombre,
      fechaInicio,
      fechaFin,
      escuelaId,
    } = validationResult.data

    // Determinar la escuelaId a usar
    let finalEscuelaId: string
    if (session.user.role === 'ADMIN' && escuelaId) {
      // Los ADMIN pueden especificar cualquier escuela
      finalEscuelaId = escuelaId
    } else if (user.escuelaId) {
      // Los PROFESOR usan su escuela asignada (ignorar cualquier escuelaId enviado)
      finalEscuelaId = user.escuelaId
    } else {
      return NextResponse.json(
        { error: 'Debe tener una escuela asignada para crear clases' },
        { status: 400 }
      )
    }

    // Validar que la escuela existe
    const escuela = await prisma.escuela.findUnique({
      where: { id: finalEscuelaId }
    })

    if (!escuela) {
      logger.warn('Intento de crear clase con escuela inexistente', { requestId, escuelaId: finalEscuelaId })
      return NextResponse.json(
        { error: 'La escuela especificada no existe' },
        { status: 400 }
      )
    }
    
    logger.debug('Escuela validada', { requestId, escuelaId: finalEscuelaId, escuelaNombre: escuela.nombre })

    // diaSemana ya está validado y convertido por Zod
    const diaSemanaNum = diaSemana

    // Obtener o crear el profesor
    let profesorFinalId: string
    if (profesorNombre) {
      const nombreProfesor = profesorNombre.trim()
      // Buscar profesor por nombre (case-insensitive usando toLowerCase)
      const todosProfesores = await prisma.profesor.findMany()
      let profesor = todosProfesores.find(
        (p: { name: string }) => p.name.toLowerCase() === nombreProfesor.toLowerCase()
      )

      // Si no existe, crearlo
      if (!profesor) {
        profesor = await prisma.profesor.create({
          data: {
            name: nombreProfesor,
          }
        })
      }

      profesorFinalId = profesor.id
    } else if (profesorId) {
      // Si se envía profesorId (para compatibilidad), validar que existe
      const profesor = await prisma.profesor.findUnique({
        where: { id: profesorId }
      })

      if (!profesor) {
        return NextResponse.json(
          { error: 'El profesor seleccionado no existe' },
          { status: 400 }
        )
      }

      profesorFinalId = profesorId
    } else {
      return NextResponse.json(
        { error: 'Debe proporcionar el nombre del profesor' },
        { status: 400 }
      )
    }

    // Si el estilo está vacío, usar el título
    const estiloFinal = (estilo && estilo.trim() !== '') ? estilo.trim() : titulo.trim()
    
    // Usar el lugar proporcionado o el nombre de la escuela como fallback
    const lugarFinal = lugar || escuela.nombre

    logger.debug('Intentando crear clase en BD', { 
      requestId, 
      titulo, 
      diaSemana: diaSemanaNum, 
      profesorId: profesorFinalId,
      escuelaId: finalEscuelaId 
    })

    const clase = await prisma.clase.create({
      data: {
        titulo,
        descripcion: descripcion || null,
        diaSemana: diaSemanaNum,
        horaInicio,
        horaFin,
        nivel,
        estilo: estiloFinal,
        lugar: lugarFinal,
        capacidad: capacidad || 20,
        profesorId: profesorFinalId,
        escuelaId: finalEscuelaId,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
      },
      include: {
        profesor: true,
        escuela: true,
      },
    })

    logger.info('Clase creada exitosamente', { 
      requestId, 
      claseId: clase.id, 
      titulo: clase.titulo,
      profesorId: clase.profesorId,
      escuelaId: clase.escuelaId 
    })

    // Notificar a los usuarios subscritos (no crítico si falla)
    try {
      await notificarUsuariosSubscritos(clase.id)
    } catch (notifError: any) {
      logger.warn('Error al notificar usuarios (no crítico)', { requestId, claseId: clase.id, error: notifError.message })
    }

    logger.info('Creación de clase completada', { 
      requestId, 
      duration: Date.now() - startTime,
      claseId: clase.id 
    })

    return NextResponse.json(clase, { status: 201 })
  } catch (error: any) {
    logger.error('Error al crear clase', error, { 
      requestId, 
      stack: error.stack,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(
      { 
        error: 'Error al crear clase',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

async function notificarUsuariosSubscritos(claseId: string) {
  // Esta función se implementará más adelante
  // Por ahora solo crea el registro de notificación
  const subscriptions = await prisma.claseSubscription.findMany({
    where: { claseId },
    include: { 
      user: true,
      clase: true,
    },
  })

  for (const sub of subscriptions) {
    if (!sub.userId) continue // Saltar si no hay userId
    await prisma.notificacion.create({
      data: {
        userId: sub.userId,
        tipo: 'EMAIL',
        mensaje: `Nueva clase disponible: ${sub.clase.titulo}`,
      },
    })
  }
}

