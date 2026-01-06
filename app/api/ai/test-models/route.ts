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

    const resultados: Array<{ modelo: string; disponible: boolean; error?: string }> = []

    // Probar cada modelo con una consulta simple
    for (const modelName of modelosParaProbar) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Hola')
        const response = await result.response
        const text = response.text()
        
        resultados.push({
          modelo: modelName,
          disponible: true,
        })
      } catch (error: any) {
        resultados.push({
          modelo: modelName,
          disponible: false,
          error: error.message || error.statusText || 'Error desconocido',
        })
      }
    }

    // También intentar listar modelos disponibles usando la API (si está disponible)
    let modelosDisponibles: string[] = []
    try {
      // Nota: La API de listar modelos puede no estar disponible en todas las versiones
      // Esto es solo un intento
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.models) {
          modelosDisponibles = data.models.map((m: any) => m.name)
        }
      }
    } catch (e) {
      // Ignorar errores al listar modelos
    }

    return NextResponse.json({
      apiKeyConfigurada: !!process.env.GEMINI_API_KEY,
      apiKeyPrefijo: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
      resultadosPrueba: resultados,
      modelosDisponibles: modelosDisponibles.length > 0 ? modelosDisponibles : null,
      recomendacion: resultados.find(r => r.disponible)?.modelo || 'Ningún modelo disponible',
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

