import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Función para normalizar nombres (convertir a minúsculas, sin espacios, sin acentos)
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, '') // Eliminar espacios
    .replace(/[^a-z0-9]/g, '') // Eliminar caracteres especiales
}

// GET - Buscar escuela por nombre normalizado
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nombre = searchParams.get('nombre')

    if (!nombre) {
      return NextResponse.json(
        { error: 'Nombre de escuela requerido' },
        { status: 400 }
      )
    }

    const nombreNormalizado = normalizarNombre(nombre)

    // Obtener todas las escuelas activas
    const escuelas = await prisma.escuela.findMany({
      where: {
        activa: true,
      },
    })

    // Buscar escuela que coincida con el nombre normalizado
    const escuelaEncontrada = escuelas.find((escuela: { nombre: string }) => {
      const nombreEscuelaNormalizado = normalizarNombre(escuela.nombre)
      return nombreEscuelaNormalizado === nombreNormalizado
    })

    if (!escuelaEncontrada) {
      return NextResponse.json(
        { error: 'Escuela no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(escuelaEncontrada)
  } catch (error) {
    console.error('Error al buscar escuela:', error)
    return NextResponse.json(
      { error: 'Error al buscar escuela' },
      { status: 500 }
    )
  }
}






