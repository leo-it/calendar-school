import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la API key esté configurada
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada' },
        { status: 500 }
      )
    }

    // Lista de modelos a probar (primero modelos recientes, luego fallbacks)
    const modelosParaProbar = [
      'gemini-2.5-flash',      // Modelo rápido y eficiente (más reciente)
      'gemini-2.5-pro',        // Modelo más potente (más reciente)
      'gemini-2.0-flash',      // Alternativa rápida
      'gemini-1.5-flash',      // Fallback: modelo rápido y confiable
      'gemini-1.5-pro',        // Fallback: modelo más potente y confiable
      'gemini-1.5-flash-002', // Fallback: versión específica de flash
      'gemini-1.5-pro-002',   // Fallback: versión específica de pro
    ]

    const resultados: Array<{ 
      modelo: string; 
      disponible: boolean; 
      error?: string;
      errorCode?: string;
      errorStatus?: number;
      respuestaEjemplo?: string;
    }> = []

    // Probar cada modelo con una consulta simple
    for (const modelName of modelosParaProbar) {
      try {
        console.log(`Probando modelo: ${modelName}`)
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          // Agregar configuración de timeout si está disponible
        })
        
        // Usar Promise.race para agregar timeout manual si es necesario
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout después de 10 segundos')), 10000)
        )
        
        const generatePromise = model.generateContent('Hola')
        const result = await Promise.race([generatePromise, timeoutPromise]) as any
        const response = await result.response
        const text = response.text()
        
        console.log(`✓ Modelo ${modelName} funcionó: ${text.substring(0, 50)}...`)
        
        resultados.push({
          modelo: modelName,
          disponible: true,
          respuestaEjemplo: text.substring(0, 100),
        })
      } catch (error: any) {
        const errorMsg = error.message || error.statusText || 'Error desconocido'
        console.error(`✗ Modelo ${modelName} falló:`, errorMsg)
        
        resultados.push({
          modelo: modelName,
          disponible: false,
          error: errorMsg,
          errorCode: error.code,
          errorStatus: error.status,
        })
      }
    }

    // Probar conectividad directa con la API
    let diagnosticoConectividad: any = {
      puedeConectar: false,
      error: null,
      statusCode: null,
    }

    // Intentar listar modelos disponibles usando la API directamente
    let modelosDisponibles: string[] = []
    try {
      console.log('Intentando conectar con la API de Gemini...')
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
      console.log('URL de prueba:', testUrl.replace(process.env.GEMINI_API_KEY || '', 'API_KEY_HIDDEN'))
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Agregar timeout
        signal: AbortSignal.timeout(10000), // 10 segundos
      })
      
      diagnosticoConectividad.statusCode = response.status
      
      if (response.ok) {
        diagnosticoConectividad.puedeConectar = true
        const data = await response.json()
        if (data.models) {
          modelosDisponibles = data.models.map((m: any) => m.name.replace('models/', ''))
        }
      } else {
        const errorData = await response.text()
        diagnosticoConectividad.error = `HTTP ${response.status}: ${errorData.substring(0, 200)}`
        console.error('Error al listar modelos:', response.status, errorData)
      }
    } catch (e: any) {
      diagnosticoConectividad.error = e.message || e.toString()
      diagnosticoConectividad.puedeConectar = false
      console.error('Error de conectividad con la API de Gemini:', e)
    }

    // Probar también con una llamada directa a generateContent usando fetch
    let pruebaDirecta: any = {
      exitosa: false,
      error: null,
    }
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
        const directResponse = await fetch(directUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Hola' }]
            }]
          }),
          signal: AbortSignal.timeout(10000),
        })
        
        if (directResponse.ok) {
          pruebaDirecta.exitosa = true
        } else {
          const errorText = await directResponse.text()
          pruebaDirecta.error = `HTTP ${directResponse.status}: ${errorText.substring(0, 200)}`
        }
      } catch (e: any) {
        pruebaDirecta.error = e.message || e.toString()
      }
    }

    return NextResponse.json({
      apiKeyConfigurada: !!process.env.GEMINI_API_KEY,
      apiKeyPrefijo: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
      apiKeyLongitud: process.env.GEMINI_API_KEY?.length || 0,
      resultadosPrueba: resultados,
      modelosDisponibles: modelosDisponibles.length > 0 ? modelosDisponibles : null,
      recomendacion: resultados.find(r => r.disponible)?.modelo || 'Ningún modelo disponible',
      diagnostico: {
        conectividad: diagnosticoConectividad,
        pruebaDirecta: pruebaDirecta,
        sugerencias: [
          diagnosticoConectividad.puedeConectar 
            ? '✓ Conectividad con la API funciona' 
            : '✗ No se puede conectar con la API. Verifica tu conexión a internet y firewall.',
          pruebaDirecta.exitosa 
            ? '✓ La API key funciona correctamente' 
            : pruebaDirecta.error?.includes('401') || pruebaDirecta.error?.includes('403')
              ? '✗ API key inválida o sin permisos. Verifica tu API key en Google AI Studio.'
              : '✗ Error al probar la API key directamente.',
          modelosDisponibles.length > 0 
            ? `✓ Se encontraron ${modelosDisponibles.length} modelos disponibles` 
            : '✗ No se pudieron listar los modelos disponibles.',
        ],
      },
    })
  } catch (error: any) {
    console.error('Error al probar modelos:', error)
    return NextResponse.json(
      {
        error: 'Error al probar modelos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

