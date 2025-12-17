import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Validar un código de invitación
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codigo = searchParams.get('codigo')

    if (!codigo) {
      return NextResponse.json(
        { error: 'Código requerido' },
        { status: 400 }
      )
    }

    const invitacion = await prisma.invitacionProfesor.findUnique({
      where: { codigo },
      include: {
        escuela: true,
      },
    })

    if (!invitacion) {
      return NextResponse.json(
        { error: 'Código de invitación inválido' },
        { status: 404 }
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

    return NextResponse.json({
      valido: true,
      escuela: invitacion.escuela,
      escuelaId: invitacion.escuelaId,
    })
  } catch (error) {
    console.error('Error al validar invitación:', error)
    return NextResponse.json(
      { error: 'Error al validar invitación' },
      { status: 500 }
    )
  }
}






