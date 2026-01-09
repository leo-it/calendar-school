import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function getGroqClient() {
  const apiKey = (process.env.GROQ_API_KEY || '').trim()
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada')
  }
  return new Groq({ apiKey })
}

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_MESSAGES = 20
const MAX_CONTEXT_LENGTH = 10000
const MAX_RESPONSE_LENGTH = 4000
const RATE_LIMIT_REQUESTS = 15
const RATE_LIMIT_WINDOW = 60 * 1000
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

setInterval(() => {
  const now = Date.now()
  const keysToDelete: string[] = []
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}, 60000)

function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/exec\s*\(/gi, '')
    .replace(/system\s*\(/gi, '')
    .replace(/shell_exec\s*\(/gi, '')
    .replace(/proc_open\s*\(/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '')
    .trim()
}

function detectMaliciousPatterns(input: string): boolean {
  if (typeof input !== 'string') return true
  
  const maliciousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi,
    /shell_exec\s*\(/gi,
    /proc_open\s*\(/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /SELECT\s+.*\s+FROM/gi,
    /INSERT\s+INTO/gi,
    /DELETE\s+FROM/gi,
    /UPDATE\s+.*\s+SET/gi,
    /DROP\s+TABLE/gi,
    /UNION\s+SELECT/gi,
  ]
  
  return maliciousPatterns.some(pattern => pattern.test(input))
}

function validateAndSanitizeMessage(message: any): { valid: boolean; sanitized?: string; error?: string } {
  if (typeof message !== 'string') {
    return { valid: false, error: 'El mensaje debe ser una cadena de texto' }
  }
  
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `El mensaje no puede exceder ${MAX_MESSAGE_LENGTH} caracteres` }
  }
  
  if (detectMaliciousPatterns(message)) {
    return { valid: false, error: 'El mensaje contiene contenido no permitido' }
  }
  
  // Sanitizar
  const sanitized = sanitizeString(message)
  
  // Validar que después de sanitizar no esté vacío
  if (!sanitized.trim()) {
    return { valid: false, error: 'El mensaje no puede estar vacío' }
  }
  
  return { valid: true, sanitized }
}

// Función para validar y sanitizar historial
function validateAndSanitizeHistory(history: any): { valid: boolean; sanitized?: any[]; error?: string } {
  // Validar que sea un array
  if (!Array.isArray(history)) {
    return { valid: false, error: 'El historial debe ser un array' }
  }
  
  // Validar límite de mensajes
  if (history.length > MAX_HISTORY_MESSAGES) {
    return { valid: false, error: `El historial no puede exceder ${MAX_HISTORY_MESSAGES} mensajes` }
  }
  
  // Validar y sanitizar cada mensaje
  const sanitized: any[] = []
  
  for (const msg of history) {
    // Validar estructura
    if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
      continue // Saltar mensajes inválidos
    }
    
    // Validar role
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      continue // Saltar roles inválidos
    }
    
    // Validar y sanitizar contenido
    const contentValidation = validateAndSanitizeMessage(msg.content)
    if (!contentValidation.valid || !contentValidation.sanitized) {
      continue // Saltar mensajes maliciosos o inválidos
    }
    
    sanitized.push({
      role: msg.role,
      content: contentValidation.sanitized,
    })
  }
  
  return { valid: true, sanitized }
}

// Función para rate limiting
function checkRateLimit(identifier: string): { allowed: boolean; remaining?: number; resetTime?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)
  
  if (!entry || now > entry.resetTime) {
    // Nueva ventana de tiempo
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW }
  }
  
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }
  
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - entry.count, resetTime: entry.resetTime }
}

// Función para truncar contexto
function truncateContext(context: string): string {
  if (context.length <= MAX_CONTEXT_LENGTH) {
    return context
  }
  
  return context.substring(0, MAX_CONTEXT_LENGTH) + '... [contexto truncado]'
}

// Función para sanitizar respuesta
function sanitizeResponse(response: string): string {
  const sanitized = sanitizeString(response)
  
  if (sanitized.length > MAX_RESPONSE_LENGTH) {
    return sanitized.substring(0, MAX_RESPONSE_LENGTH) + '... [respuesta truncada]'
  }
  
  return sanitized
}

// Función para obtener IP del request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Función para obtener contexto general (sin usuario autenticado)
async function obtenerContextoGeneral() {
  try {
    // Obtener todas las escuelas activas
    const escuelas = await prisma.escuela.findMany({
      where: { activa: true },
      select: {
        nombre: true,
        direccion: true,
        telefono: true,
        email: true,
        whatsapp: true,
        instagram: true,
        facebook: true,
        web: true,
      },
      take: 10, // Limitar a 10 escuelas para no exceder contexto
    })

    // Obtener clases públicas (de todas las escuelas activas)
    const clases = await prisma.clase.findMany({
      where: { activa: true },
      include: {
        profesor: {
          select: {
            name: true,
          },
        },
        escuela: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: [
        { diaSemana: 'asc' },
        { horaInicio: 'asc' },
      ],
      take: 50, // Limitar a 50 clases para no exceder contexto
    })

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    
    const clasesFormateadas = clases.map((clase) => ({
      id: clase.id,
      titulo: clase.titulo,
      descripcion: clase.descripcion || '',
      dia: diasSemana[clase.diaSemana],
      horaInicio: clase.horaInicio,
      horaFin: clase.horaFin,
      nivel: clase.nivel,
      estilo: clase.estilo,
      lugar: clase.lugar,
      capacidad: clase.capacidad,
      profesor: clase.profesor.name,
      escuela: clase.escuela.nombre,
    }))

    return {
      escuelas: escuelas,
      clasesDisponibles: clasesFormateadas,
      totalClases: clasesFormateadas.length,
      totalEscuelas: escuelas.length,
    }
  } catch (error) {
    return { error: 'Error al obtener contexto general' }
  }
}

// Función para obtener contexto del usuario
async function obtenerContextoUsuario(userId: string) {
  try {
    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        apellido: true,
        role: true,
        escuelaId: true,
        escuela: {
          select: {
            nombre: true,
            direccion: true,
            telefono: true,
            email: true,
            whatsapp: true,
            instagram: true,
            facebook: true,
            web: true,
          },
        },
      },
    })

    if (!user) {
      return { error: 'Usuario no encontrado' }
    }

    // Obtener clases disponibles (próximas 2 semanas)
    const fechaInicio = new Date()
    fechaInicio.setUTCHours(0, 0, 0, 0)
    const fechaFin = new Date()
    fechaFin.setDate(fechaFin.getDate() + 14) // 2 semanas
    fechaFin.setUTCHours(23, 59, 59, 999)

    const whereClause: any = {
      activa: true,
    }

    if (user.escuelaId) {
      whereClause.escuelaId = user.escuelaId
    }

    const clases = await prisma.clase.findMany({
      where: whereClause,
      include: {
        profesor: {
          select: {
            name: true,
            email: true,
          },
        },
        escuela: {
          select: {
            nombre: true,
          },
        },
        subscriptions: {
          where: {
            userId: userId,
          },
          select: {
            fecha: true,
          },
        },
      },
      orderBy: [
        { diaSemana: 'asc' },
        { horaInicio: 'asc' },
      ],
    })

    // Obtener inscripciones del usuario
    const inscripciones = await prisma.claseSubscription.findMany({
      where: {
        userId: userId,
      },
      include: {
        clase: {
          select: {
            id: true,
            titulo: true,
            diaSemana: true,
            horaInicio: true,
            horaFin: true,
            nivel: true,
            estilo: true,
            lugar: true,
            profesor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Formatear clases para el contexto
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    
    const clasesFormateadas = clases.map((clase) => {
      const estaInscrito = clase.subscriptions.length > 0
      return {
        id: clase.id,
        titulo: clase.titulo,
        descripcion: clase.descripcion || '',
        dia: diasSemana[clase.diaSemana],
        horaInicio: clase.horaInicio,
        horaFin: clase.horaFin,
        nivel: clase.nivel,
        estilo: clase.estilo,
        lugar: clase.lugar,
        capacidad: clase.capacidad,
        profesor: clase.profesor.name,
        estaInscrito: estaInscrito,
      }
    })

    const inscripcionesFormateadas = inscripciones.map((inscripcion) => ({
      claseId: inscripcion.clase.id,
      titulo: inscripcion.clase.titulo,
      dia: diasSemana[inscripcion.clase.diaSemana],
      horaInicio: inscripcion.clase.horaInicio,
      horaFin: inscripcion.clase.horaFin,
      nivel: inscripcion.clase.nivel,
      estilo: inscripcion.clase.estilo,
      lugar: inscripcion.clase.lugar,
      profesor: inscripcion.clase.profesor.name,
    }))

    return {
      usuario: {
        nombre: user.name || 'Usuario',
        apellido: user.apellido || '',
        email: user.email,
        role: user.role,
      },
      escuela: user.escuela ? {
        nombre: user.escuela.nombre,
        direccion: user.escuela.direccion,
        telefono: user.escuela.telefono,
        email: user.escuela.email,
        whatsapp: user.escuela.whatsapp,
        instagram: user.escuela.instagram,
        facebook: user.escuela.facebook,
        web: user.escuela.web,
      } : null,
      clasesDisponibles: clasesFormateadas,
      misInscripciones: inscripcionesFormateadas,
      totalClases: clasesFormateadas.length,
      totalInscripciones: inscripcionesFormateadas.length,
    }
  } catch (error) {
    return { error: 'Error al obtener contexto del usuario' }
  }
}

// Función auxiliar para intentar generar respuesta con diferentes modelos
async function generarRespuestaConGroq(
  systemPrompt: string,
  message: string,
  conversationHistory: any[]
): Promise<string> {
  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory
        .filter((msg: { role: string; content: string }) => msg.role === 'user' || msg.role === 'assistant')
        .forEach((msg: { role: string; content: string }) => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })
        })
    }
    messages.push({
      role: 'user',
      content: message,
    })

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No se recibió respuesta de Groq')
    }

    return response
  } catch (error: any) {
    const errorMessage = error.message || 'Error desconocido'
    const errorStatus = error.status || error.statusCode || error.response?.status

    if (errorStatus === 401 || errorMessage.includes('API key') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      throw new Error(`API key de Groq inválida. Verifica que GROQ_API_KEY esté correctamente configurada. Error: ${errorMessage}`)
    }

    if (errorStatus === 429 || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      throw new Error(`Límite de uso alcanzado. Por favor, intenta más tarde.`)
    }

    throw new Error(`Error al llamar a Groq: ${errorMessage} (Status: ${errorStatus || 'N/A'})`)
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const groqApiKey = process.env.GROQ_API_KEY
    const hasGroqApiKey = !!groqApiKey
    const groqApiKeyLength = groqApiKey?.length || 0
    const groqApiKeyTrimmed = groqApiKey?.trim() || ''
    const isEmpty = groqApiKeyTrimmed === ''
    
    logger.info('Iniciando solicitud de chat', { 
      requestId, 
      action: 'chat_request_start',
      hasGroqApiKey,
      groqApiKeyLength,
      isEmpty,
      nodeEnv: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('GROQ') || k.includes('API')).join(', ')
    })
    
    if (!hasGroqApiKey || isEmpty) {
      logger.error('GROQ_API_KEY no configurada', undefined, { 
        requestId, 
        action: 'chat_config_error',
        hasGroqApiKey,
        groqApiKeyLength,
        isEmpty,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('GROQ') || k.includes('API')).join(', ')
      })
      return NextResponse.json(
        { 
          error: 'Error de configuración: API key de Groq no configurada',
          details: process.env.NODE_ENV === 'development' 
            ? 'GROQ_API_KEY no está configurada en las variables de entorno. Obtén una API key gratis en https://console.groq.com' 
            : 'Verifica que GROQ_API_KEY esté configurada en Railway y haz redeploy.'
        },
        { status: 500 }
      )
    }

    const session = await getServerSession(authOptions)
    
    // Rate limiting: por usuario si está autenticado, por IP si no
    const rateLimitIdentifier = session ? `user:${session.user.id}` : `ip:${getClientIP(request)}`
    const rateLimitCheck = checkRateLimit(rateLimitIdentifier)
    
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Has excedido el límite de solicitudes. Por favor, espera un momento antes de intentar nuevamente.',
          retryAfter: Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining || 0),
            'X-RateLimit-Reset': String(rateLimitCheck.resetTime),
          }
        }
      )
    }

    // Validar y parsear el body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }

    const { message, conversationHistory } = body

    // Validar y sanitizar mensaje
    const messageValidation = validateAndSanitizeMessage(message)
    if (!messageValidation.valid) {
      return NextResponse.json(
        { error: messageValidation.error || 'Mensaje inválido' },
        { status: 400 }
      )
    }

    const sanitizedMessage = messageValidation.sanitized!

    // Validar y sanitizar historial
    let sanitizedHistory: any[] = []
    if (conversationHistory) {
      const historyValidation = validateAndSanitizeHistory(conversationHistory)
      if (!historyValidation.valid) {
        return NextResponse.json(
          { error: historyValidation.error || 'Historial inválido' },
          { status: 400 }
        )
      }
      sanitizedHistory = historyValidation.sanitized || []
    }


    // Obtener contexto según si hay sesión o no
    let contexto
    if (session) {
      contexto = await obtenerContextoUsuario(session.user.id)
    } else {
      contexto = await obtenerContextoGeneral()
    }

    if ('error' in contexto) {
      return NextResponse.json({ error: contexto.error }, { status: 500 })
    }

    // Construir el prompt del sistema según si hay sesión o no
    let systemPrompt: string
    
    if (session && 'usuario' in contexto) {
      // Usuario autenticado
      const infoContacto = contexto.escuela ? [
        contexto.escuela.direccion && `Dirección: ${contexto.escuela.direccion}`,
        contexto.escuela.telefono && `Teléfono: ${contexto.escuela.telefono}`,
        contexto.escuela.whatsapp && `WhatsApp: ${contexto.escuela.whatsapp}`,
        contexto.escuela.email && `Email: ${contexto.escuela.email}`,
        contexto.escuela.instagram && `Instagram: ${contexto.escuela.instagram}`,
        contexto.escuela.facebook && `Facebook: ${contexto.escuela.facebook}`,
        contexto.escuela.web && `Sitio Web: ${contexto.escuela.web}`,
      ].filter(Boolean).join('\n') : 'No disponible'

      systemPrompt = `Eres un asistente virtual amigable de una escuela de danza llamado "Almanaque". 
Tu función es ayudar a los estudiantes a encontrar y gestionar sus clases de danza.

INFORMACIÓN DEL USUARIO:
- Nombre: ${contexto.usuario.nombre} ${contexto.usuario.apellido}
- Rol: ${contexto.usuario.role}
- Escuela: ${contexto.escuela?.nombre || 'No asignada'}

INFORMACIÓN DE CONTACTO DE LA ESCUELA:
${infoContacto}

CLASES DISPONIBLES (${contexto.totalClases} clases):
${JSON.stringify(contexto.clasesDisponibles, null, 2)}

MIS INSCRIPCIONES ACTUALES (${contexto.totalInscripciones} inscripciones):
${JSON.stringify(contexto.misInscripciones, null, 2)}

INSTRUCCIONES:
1. Responde de manera amigable y en español
2. Ayuda al usuario a encontrar clases según sus preferencias (estilo, nivel, día, hora)
3. Si pregunta por clases específicas, usa la información de CLASES DISPONIBLES
4. Si pregunta sobre sus inscripciones, usa la información de MIS INSCRIPCIONES ACTUALES
5. Si el usuario quiere inscribirse, indícale que puede hacerlo desde el calendario
6. Si hay conflictos de horarios, menciónalos
7. Si el usuario pregunta por información de contacto (dirección, teléfono, WhatsApp, email, redes sociales), usa la información de INFORMACIÓN DE CONTACTO DE LA ESCUELA
8. Si pregunta por la dirección o cómo llegar, proporciona la dirección de la escuela
9. Si pregunta por WhatsApp o cómo contactar, proporciona el número de WhatsApp y otros medios de contacto disponibles
10. Sé conciso pero útil
11. Si no sabes algo, admítelo amablemente

IMPORTANTE: 
- Los días de la semana son: Domingo (0), Lunes (1), Martes (2), Miércoles (3), Jueves (4), Viernes (5), Sábado (6)
- Los niveles son: PRINCIPIANTE, INTERMEDIO, AVANZADO
- Los estilos incluyen: CONTEMPORANEO, JAZZ, BALLET, HIP_HOP, URBANO, TANGO, etc.
- Siempre que menciones WhatsApp, proporciona el número completo tal como aparece en la información de contacto`
    } else {
      // Usuario no autenticado - información general
      const contextoGeneral = contexto as { escuelas: any[]; clasesDisponibles: any[]; totalClases: number; totalEscuelas: number }
      const escuelasInfo = contextoGeneral.escuelas?.map((escuela: any) => 
        `- ${escuela.nombre}: ${escuela.direccion || 'Sin dirección'} | ${escuela.telefono || 'Sin teléfono'} | ${escuela.whatsapp || 'Sin WhatsApp'}`
      ).join('\n') || 'No hay escuelas disponibles'

      systemPrompt = `Eres un asistente virtual amigable de una plataforma de gestión de clases de danza llamado "Almanaque". 
Tu función es ayudar a los visitantes a conocer las clases disponibles y las escuelas.

INFORMACIÓN GENERAL:

ESCUELAS DISPONIBLES (${contextoGeneral.totalEscuelas || 0} escuelas):
${escuelasInfo}

CLASES DISPONIBLES (${contextoGeneral.totalClases} clases):
${JSON.stringify(contextoGeneral.clasesDisponibles, null, 2)}

INSTRUCCIONES:
1. Responde de manera amigable y en español
2. Ayuda al visitante a conocer las clases disponibles según sus preferencias (estilo, nivel, día, hora)
3. Si pregunta por clases específicas, usa la información de CLASES DISPONIBLES
4. Si pregunta sobre información de contacto de escuelas, proporciona la información disponible
5. Indica que para inscribirse en clases, debe registrarse e iniciar sesión
6. Sé conciso pero útil
7. Si no sabes algo, admítelo amablemente
8. Recuerda que el usuario NO está autenticado, por lo que no puede ver sus inscripciones personales

IMPORTANTE: 
- Los días de la semana son: Domingo (0), Lunes (1), Martes (2), Miércoles (3), Jueves (4), Viernes (5), Sábado (6)
- Los niveles son: PRINCIPIANTE, INTERMEDIO, AVANZADO
- Los estilos incluyen: CONTEMPORANEO, JAZZ, BALLET, HIP_HOP, URBANO, TANGO, etc.`
    }

    // Truncar contexto si es muy largo
    systemPrompt = truncateContext(systemPrompt)

    let text: string | null = null
    try {
      text = await generarRespuestaConGroq(systemPrompt, sanitizedMessage, sanitizedHistory)
    } catch (error: any) {
      throw error
    }

    if (!text) {
      throw new Error('No se recibió respuesta de Groq')
    }

    // Sanitizar respuesta antes de enviar
    const sanitizedResponse = sanitizeResponse(text)
    
    const duration = Date.now() - startTime
    logger.info('Chat completado exitosamente', { 
      requestId, 
      action: 'chat_success',
      duration,
      hasSession: !!session,
      userId: session?.user?.id
    })

    return NextResponse.json({
      response: sanitizedResponse,
      contexto: session && 'totalInscripciones' in contexto ? {
        totalClases: contexto.totalClases,
        totalInscripciones: contexto.totalInscripciones,
      } : {
        totalClases: contexto.totalClases,
      },
    }, {
      headers: {
        'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
        'X-RateLimit-Remaining': String(rateLimitCheck.remaining || 0),
        'X-RateLimit-Reset': String(rateLimitCheck.resetTime),
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    const errorMessage = error?.message || 'Error desconocido'
    const errorStack = error?.stack
    
    logger.error('Error en chat de IA', error, { 
      requestId, 
      action: 'chat_error',
      duration,
      errorType: error?.name || 'UnknownError',
      errorMessage,
      hasGroqApiKey: !!process.env.GROQ_API_KEY,
      groqApiKeyLength: process.env.GROQ_API_KEY?.length || 0
    })
    
    if (errorMessage.includes('API_KEY') || errorMessage.includes('API key') || errorMessage.includes('unauthorized') || error?.status === 401) {
      return NextResponse.json(
        { 
          error: 'Error de configuración: API key de Groq inválida o no configurada',
          details: process.env.NODE_ENV === 'development' 
            ? `${errorMessage}. Verifica que GROQ_API_KEY esté configurada correctamente en Railway. Obtén una API key gratis en https://console.groq.com` 
            : 'Verifica que GROQ_API_KEY esté configurada en las variables de entorno de producción.'
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || error?.status === 429) {
      return NextResponse.json(
        { error: 'Límite de uso alcanzado. Por favor, intenta más tarde.' },
        { status: 429 }
      )
    }

    if (errorMessage.includes('conectividad') || errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { 
          error: 'Error de conectividad con la API de Groq. Por favor, intenta más tarde.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error al procesar la consulta. Por favor, intenta nuevamente.',
        ...(process.env.NODE_ENV === 'development' && { 
          details: errorMessage,
          stack: errorStack,
          requestId
        })
      },
      { status: 500 }
    )
  }
}

