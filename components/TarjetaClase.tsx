'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Clase, Profesor } from '@prisma/client'
import { Nivel, Estilo } from '@/types/enums'
import ModalClase from './ModalClase'

interface ClaseConProfesor extends Clase {
  profesor: Profesor
  fecha?: Date | string // Fecha específica de la ocurrencia (añadida por la API del calendario)
}

interface TarjetaClaseProps {
  clase: ClaseConProfesor
  usuarioId: string
  usuarioRole?: string
  esAdminEscuela?: boolean
  onActualizada: () => void
  compacta?: boolean
}

export default function TarjetaClase({
  clase,
  usuarioId,
  usuarioRole,
  esAdminEscuela,
  onActualizada,
  compacta = false,
}: TarjetaClaseProps) {
  const router = useRouter()
  const [subscribiendo, setSubscribiendo] = useState(false)
  const [estaSubscrito, setEstaSubscrito] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [inscripciones, setInscripciones] = useState<{ inscritos: number; capacidad: number; cuposDisponibles: number } | null>(null)
  
  // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
  const claseIdReal = clase.id.includes('-') ? clase.id.split('-')[0] : clase.id
  const puedeEditar = usuarioRole === 'ADMIN' || (usuarioRole === 'PROFESOR' && esAdminEscuela)

  useEffect(() => {
    cargarInscripciones()
  }, [clase.id])

  const cargarInscripciones = async () => {
    try {
      const response = await fetch(`/api/clases/${claseIdReal}/subscriptions-count`)
      if (response.ok) {
        const data = await response.json()
        setInscripciones(data)
      }
    } catch (error) {
      console.error('Error al cargar inscripciones:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta clase? Esto eliminará todas las ocurrencias recurrentes.')) {
      return
    }

    setEliminando(true)
    try {
      const response = await fetch(`/api/clases/${claseIdReal}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onActualizada()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar la clase')
      }
    } catch (error) {
      console.error('Error al eliminar clase:', error)
      alert('Error al eliminar la clase')
    } finally {
      setEliminando(false)
    }
  }

  const handleEdit = () => {
    router.push(`/clases/${claseIdReal}/editar`)
  }

  const handleSubscribe = async () => {
    setSubscribiendo(true)
    try {
      const response = await fetch('/api/clases/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claseId: clase.id }),
      })

      if (response.ok) {
        setEstaSubscrito(true)
        cargarInscripciones() // Actualizar conteo de inscripciones
        onActualizada()
      }
    } catch (error) {
      console.error('Error al subscribirse:', error)
    } finally {
      setSubscribiendo(false)
    }
  }

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'PRINCIPIANTE':
        return 'bg-green-100 text-green-800'
      case 'INTERMEDIO':
        return 'bg-yellow-100 text-yellow-800'
      case 'AVANZADO':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstiloColor = (estilo: string) => {
    const colores: Record<string, string> = {
      CONTEMPORANEO: 'bg-blue-100 text-blue-800',
      JAZZ: 'bg-purple-100 text-purple-800',
      BALLET: 'bg-pink-100 text-pink-800',
      HIP_HOP: 'bg-orange-100 text-orange-800',
      URBANO: 'bg-indigo-100 text-indigo-800',
      OTRO: 'bg-gray-100 text-gray-800',
    }
    return colores[estilo] || colores.OTRO
  }

  if (compacta) {
    return (
      <>
        <div
          onClick={() => setMostrarModal(true)}
          className={`p-2 rounded border-l-4 cursor-pointer hover:shadow-sm transition-shadow ${
            clase.activa ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="text-sm font-semibold text-gray-900">
            {clase.titulo}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {clase.horaInicio} - {clase.horaFin}
          </div>
          <div className="text-xs text-gray-700 mt-1">
            prof: {clase.profesor.name}
          </div>
          <div className="flex gap-1 mt-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded ${getNivelColor(clase.nivel)}`}>
              {clase.nivel.charAt(0) + clase.nivel.slice(1).toLowerCase()}
            </span>
          </div>
        </div>
        {mostrarModal && (
          <ModalClase
            clase={clase}
            usuarioId={usuarioId}
            usuarioRole={usuarioRole}
            esAdminEscuela={esAdminEscuela}
            onClose={() => setMostrarModal(false)}
            onActualizada={() => {
              onActualizada()
              setMostrarModal(false)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div 
        onClick={() => setMostrarModal(true)}
        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{clase.titulo}</h3>
          {!clase.activa && (
            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
              Inactiva
            </span>
          )}
        </div>

        {clase.descripcion && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{clase.descripcion}</p>
        )}

        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium">Fecha:</span>
            <span className="ml-2">
              {clase.fecha 
                ? format(parseISO(clase.fecha.toString()), "d 'de' MMMM 'de' yyyy", { locale: es })
                : 'Fecha no especificada'}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium">Horario:</span>
            <span className="ml-2">{clase.horaInicio} - {clase.horaFin}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium">prof:</span>
            <span className="ml-2">{clase.profesor.name}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium">Nivel:</span>
            <span className="ml-2">{clase.nivel.charAt(0) + clase.nivel.slice(1).toLowerCase()}</span>
          </div>
        <div className="flex items-center text-sm text-gray-700">
          <span className="font-medium">Lugar:</span>
          <span className="ml-2">{clase.lugar}</span>
        </div>
        {inscripciones && (
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium">Cupos:</span>
            <span className="ml-2">
              {inscripciones.inscritos} / {inscripciones.capacidad}
              {inscripciones.cuposDisponibles > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  ({inscripciones.cuposDisponibles} disponible{inscripciones.cuposDisponibles !== 1 ? 's' : ''})
                </span>
              )}
              {inscripciones.cuposDisponibles === 0 && (
                <span className="ml-2 text-red-600 font-medium">(Llena)</span>
              )}
            </span>
          </div>
        )}
      </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getNivelColor(clase.nivel)}`}>
            {clase.nivel.charAt(0) + clase.nivel.slice(1).toLowerCase()}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getEstiloColor(clase.estilo)}`}>
            {clase.estilo.replace('_', ' ').charAt(0) + clase.estilo.replace('_', ' ').slice(1).toLowerCase()}
          </span>
        </div>

        <div className="flex gap-2">
          {puedeEditar && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                disabled={eliminando}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          )}
          {clase.activa && !puedeEditar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSubscribe()
              }}
              disabled={subscribiendo || estaSubscrito}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                estaSubscrito
                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              } disabled:opacity-50`}
            >
              {subscribiendo
                ? 'Subscribiendo...'
                : estaSubscrito
                ? '✓ Subscrito'
                : 'Subscribirse a esta clase'}
            </button>
          )}
        </div>
      </div>
      {mostrarModal && (
        <ModalClase
          clase={clase}
          usuarioId={usuarioId}
          usuarioRole={usuarioRole}
          esAdminEscuela={esAdminEscuela}
          onClose={() => setMostrarModal(false)}
          onActualizada={() => {
            onActualizada()
            setMostrarModal(false)
          }}
        />
      )}
    </>
  )
}

