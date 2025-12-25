import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Normalizar fechas para evitar problemas de zona horaria
    // Usar UTC para mantener consistencia
    const fechaInicio = new Date(inicio)
    fechaInicio.setUTCHours(0, 0, 0, 0)
    const fechaFin = new Date(fin)
    fechaFin.setUTCHours(23, 59, 59, 999)

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
    fechaActual.setUTCHours(0, 0, 0, 0)
    
    // Crear una fecha límite normalizada para la comparación
    const fechaFinNormalizada = new Date(fechaFin)
    fechaFinNormalizada.setUTCHours(23, 59, 59, 999)

    while (fechaActual <= fechaFinNormalizada) {
      // Usar getUTCDay() para evitar problemas de zona horaria
      // 0 = Domingo, 1 = Lunes, etc.
      const diaSemana = fechaActual.getUTCDay()
      
      // Buscar clases que coincidan con este día de la semana
      const clasesDelDia = clasesRecurrentes.filter((clase: typeof clasesRecurrentes[0]) => {
        // Verificar si hay restricciones de fecha
        if (clase.fechaInicio) {
          const fechaInicioClase = new Date(clase.fechaInicio)
          fechaInicioClase.setUTCHours(0, 0, 0, 0)
          if (fechaActual < fechaInicioClase) return false
        }
        if (clase.fechaFin) {
          const fechaFinClase = new Date(clase.fechaFin)
          fechaFinClase.setUTCHours(23, 59, 59, 999)
          if (fechaActual > fechaFinClase) return false
        }
        
        return clase.diaSemana === diaSemana
      })

      // Generar una ocurrencia para cada clase del día
      clasesDelDia.forEach((clase: typeof clasesRecurrentes[0]) => {
        const fechaClase = new Date(fechaActual)
        fechaClase.setUTCHours(0, 0, 0, 0)
        clasesGeneradas.push({
          ...clase,
          fecha: fechaClase,
          id: `${clase.id}-${fechaActual.toISOString().split('T')[0]}`, // ID único para esta ocurrencia
        })
      })

      // Avanzar al siguiente día en UTC
      fechaActual.setUTCDate(fechaActual.getUTCDate() + 1)
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
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN' && session.user.role !== 'PROFESOR') {
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
    console.log('Body recibido:', body)
    
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
      escuelaId, // Permitir especificar escuelaId (solo para ADMIN)
    } = body

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
      return NextResponse.json(
        { error: 'La escuela especificada no existe' },
        { status: 400 }
      )
    }

    // Validar y convertir diaSemana
    const diaSemanaNum = typeof diaSemana === 'string' ? parseInt(diaSemana, 10) : diaSemana
    console.log('diaSemana recibido:', diaSemana, 'convertido a:', diaSemanaNum)
    
    if (isNaN(diaSemanaNum) || diaSemanaNum < 0 || diaSemanaNum > 6) {
      return NextResponse.json(
        { error: `Día de la semana inválido: ${diaSemana}. Debe ser un número entre 0 y 6` },
        { status: 400 }
      )
    }

    // Validar campos requeridos
    if (!titulo || !horaInicio || !horaFin || !nivel || !estilo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: título, hora de inicio, hora de fin, nivel o estilo' },
        { status: 400 }
      )
    }

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

    // El lugar será el nombre de la escuela
    const lugarFinal = escuela.nombre

    const clase = await prisma.clase.create({
      data: {
        titulo,
        descripcion: descripcion || null,
        diaSemana: diaSemanaNum,
        horaInicio,
        horaFin,
        nivel,
        estilo: estilo || 'OTRO', // Si no se proporciona, usar OTRO
        lugar: lugarFinal,
        capacidad: parseInt(capacidad) || 20,
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

    // Notificar a los usuarios subscritos
    await notificarUsuariosSubscritos(clase.id)

    return NextResponse.json(clase, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear clase:', error)
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
    await prisma.notificacion.create({
      data: {
        userId: sub.userId,
        tipo: 'EMAIL',
        mensaje: `Nueva clase disponible: ${sub.clase.titulo}`,
      },
    })
  }
}

