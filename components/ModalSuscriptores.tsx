'use client'

import { useState, useEffect } from 'react'

interface Suscriptor {
  id: string
  userId: string
  email: string
  name: string | null
  apellido: string | null
  dni: string | null
  phone: string | null
  fechaInscripcion: string
}

interface Usuario {
  id: string
  email: string
  name: string | null
  apellido: string | null
  dni: string | null
  phone: string | null
}

interface ModalSuscriptoresProps {
  claseId: string
  claseTitulo: string
  capacidad: number
  onClose: () => void
  onActualizada?: () => void
}

export default function ModalSuscriptores({
  claseId,
  claseTitulo,
  capacidad,
  onClose,
  onActualizada,
}: ModalSuscriptoresProps) {
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buscarUsuario, setBuscarUsuario] = useState('')
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<Usuario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [añadiendo, setAñadiendo] = useState<string | null>(null)

  useEffect(() => {
    cargarSuscriptores()
  }, [claseId])

  useEffect(() => {
    if (buscarUsuario.length >= 2) {
      const timeoutId = setTimeout(() => {
        buscarUsuarios()
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setUsuariosEncontrados([])
    }
  }, [buscarUsuario])

  const cargarSuscriptores = async () => {
    setLoading(true)
    setError('')
    try {
      // Extraer el ID real de la clase
      const idReal = claseId.includes('-') ? claseId.split('-')[0] : claseId
      const response = await fetch(`/api/clases/${idReal}/subscriptions`)
      
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al cargar suscriptores')
        return
      }

      const data = await response.json()
      setSuscriptores(data.suscriptores || [])
    } catch (err) {
      setError('Error al cargar suscriptores')
    } finally {
      setLoading(false)
    }
  }

  const buscarUsuarios = async () => {
    setBuscando(true)
    try {
      const response = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(buscarUsuario)}`)
      
      if (!response.ok) {
        return
      }

      const usuarios = await response.json()
      // Filtrar usuarios que ya están suscritos
      const usuariosNoSuscritos = usuarios.filter(
        (u: Usuario) => !suscriptores.some(s => s.userId === u.id)
      )
      setUsuariosEncontrados(usuariosNoSuscritos)
    } catch (err) {
      console.error('Error al buscar usuarios:', err)
    } finally {
      setBuscando(false)
    }
  }

  const añadirUsuario = async (userId: string) => {
    setAñadiendo(userId)
    try {
      const idReal = claseId.includes('-') ? claseId.split('-')[0] : claseId
      const response = await fetch(`/api/clases/${idReal}/subscriptions/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Error al añadir usuario')
        return
      }

      // Recargar suscriptores
      await cargarSuscriptores()
      setBuscarUsuario('')
      setUsuariosEncontrados([])
      
      if (onActualizada) {
        onActualizada()
      }
    } catch (err) {
      alert('Error al añadir usuario')
    } finally {
      setAñadiendo(null)
    }
  }

  const cuposDisponibles = capacidad - suscriptores.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{claseTitulo}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {suscriptores.length} / {capacidad} inscritos
                {cuposDisponibles > 0 && (
                  <span className="ml-2 text-green-600">({cuposDisponibles} cupos disponibles)</span>
                )}
                {cuposDisponibles === 0 && (
                  <span className="ml-2 text-red-600">(Sin cupos disponibles)</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Buscar y añadir usuario */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar y añadir estudiante
          </label>
          <div className="relative">
            <input
              type="text"
              value={buscarUsuario}
              onChange={(e) => setBuscarUsuario(e.target.value)}
              placeholder="Ej: Juan Pérez o juan@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={cuposDisponibles === 0}
            />
            {buscando && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>

          {/* Lista de usuarios encontrados */}
          {usuariosEncontrados.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {usuariosEncontrados.map((usuario) => (
                <div
                  key={usuario.id}
                  className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {usuario.name || 'Sin nombre'}
                      {usuario.apellido && ` ${usuario.apellido}`}
                    </p>
                    {usuario.dni && (
                      <p className="text-xs text-gray-500">DNI: {usuario.dni}</p>
                    )}
                    <p className="text-sm text-gray-500">{usuario.email}</p>
                    {usuario.phone && (
                      <p className="text-xs text-gray-400">{usuario.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => añadirUsuario(usuario.id)}
                    disabled={añadiendo === usuario.id || cuposDisponibles === 0}
                    className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {añadiendo === usuario.id ? 'Añadiendo...' : 'Añadir'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de suscriptores */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-500">Cargando suscriptores...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : suscriptores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay estudiantes inscritos en esta clase.
            </div>
          ) : (
            <div className="space-y-3">
              {suscriptores.map((suscriptor) => (
                <div
                  key={suscriptor.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {suscriptor.name || 'Sin nombre'}
                        {suscriptor.apellido && ` ${suscriptor.apellido}`}
                      </p>
                      {suscriptor.dni && (
                        <p className="text-xs text-gray-500">DNI: {suscriptor.dni}</p>
                      )}
                      <p className="text-sm text-gray-600">{suscriptor.email}</p>
                      {suscriptor.phone && (
                        <p className="text-xs text-gray-500 mt-1">{suscriptor.phone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Inscrito el {new Date(suscriptor.fechaInscripcion).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

