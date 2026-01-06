'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useModal } from './useModal'

interface Suscriptor {
  id: string
  userId: string | null
  email: string | null
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
  const [modoInscripcion, setModoInscripcion] = useState<'buscar' | 'nuevo'>('buscar')
  const [formularioNuevo, setFormularioNuevo] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    phone: '',
  })
  const [creandoNuevo, setCreandoNuevo] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const { modal, showModal, showConfirm, closeModal } = useModal()

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
      // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
      let idReal = claseId
      let fechaClase: string | null = null
      
      if (claseId.includes('-')) {
        const partes = claseId.split('-')
        idReal = partes[0]
        // Intentar extraer la fecha del formato "id-YYYY-MM-DD"
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      const url = fechaClase 
        ? `/api/clases/${idReal}/subscriptions?fecha=${fechaClase}`
        : `/api/clases/${idReal}/subscriptions`
      const response = await fetch(url)
      
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
      
      // Extraer fecha si está en el claseId
      let fechaClase: string | null = null
      if (claseId.includes('-')) {
        const partes = claseId.split('-')
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      const body: any = { userId }
      if (fechaClase) {
        body.fecha = fechaClase
      }
      
      const response = await fetch(`/api/clases/${idReal}/subscriptions/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

          if (!response.ok) {
            const data = await response.json()
            showModal(data.error || 'Error al añadir usuario', 'error')
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
        showModal('Error al añadir usuario', 'error')
      } finally {
      setAñadiendo(null)
    }
  }

  const inscribirNuevoAlumno = async () => {
    if (!formularioNuevo.nombre || !formularioNuevo.apellido) {
      showModal('El nombre y apellido son requeridos', 'warning')
      return
    }

    setCreandoNuevo(true)
    try {
      const idReal = claseId.includes('-') ? claseId.split('-')[0] : claseId
      
      // Extraer fecha si está en el claseId
      let fechaClase: string | null = null
      if (claseId.includes('-')) {
        const partes = claseId.split('-')
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }

      const response = await fetch(`/api/clases/${idReal}/subscriptions/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formularioNuevo.nombre,
          apellido: formularioNuevo.apellido,
          dni: formularioNuevo.dni || null,
          email: formularioNuevo.email || '-',
          phone: formularioNuevo.phone || null,
          fecha: fechaClase,
        }),
      })

          if (!response.ok) {
            const data = await response.json()
            showModal(data.error || 'Error al inscribir alumno', 'error')
            return
          }

      // Recargar suscriptores
      await cargarSuscriptores()
      setFormularioNuevo({ nombre: '', apellido: '', dni: '', email: '', phone: '' })
      setModoInscripcion('buscar')
      
      if (onActualizada) {
        onActualizada()
        }
      } catch (err) {
        showModal('Error al inscribir alumno', 'error')
      } finally {
      setCreandoNuevo(false)
    }
  }

  const eliminarSuscriptor = async (subscriptionId: string, userId: string | null) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar a este alumno de la clase?',
      () => {
        ejecutarEliminacion(subscriptionId, userId)
      },
      'warning',
      'Confirmar eliminación'
    )
  }

  const ejecutarEliminacion = async (subscriptionId: string, userId: string | null) => {
    setEliminando(subscriptionId)
    try {
      const idReal = claseId.includes('-') ? claseId.split('-')[0] : claseId
      let fechaClase: string | null = null
      if (claseId.includes('-')) {
        const partes = claseId.split('-')
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }

      const response = await fetch(`/api/clases/${idReal}/subscriptions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionId, 
          userId, // Pasar userId para asegurar la eliminación correcta de suscripciones de usuario
          fecha: fechaClase // Pasar la fecha para eliminar la suscripción exacta
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        showModal(data.error || 'Error al eliminar suscriptor', 'error')
        return
      }

      await cargarSuscriptores()
      showModal('Alumno eliminado correctamente', 'success')
      if (onActualizada) {
        onActualizada()
      }
    } catch (err) {
      showModal('Error al eliminar suscriptor', 'error')
    } finally {
      setEliminando(null)
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
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setModoInscripcion('buscar')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                modoInscripcion === 'buscar'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              disabled={cuposDisponibles === 0}
            >
              Buscar Alumno
            </button>
            <button
              onClick={() => setModoInscripcion('nuevo')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                modoInscripcion === 'nuevo'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              disabled={cuposDisponibles === 0}
            >
              Inscribir Nuevo
            </button>
          </div>

          {modoInscripcion === 'buscar' ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar estudiante registrado
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
            </>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Datos del nuevo alumno
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formularioNuevo.nombre}
                    onChange={(e) => setFormularioNuevo({ ...formularioNuevo, nombre: e.target.value })}
                    placeholder="Ej: Juan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    disabled={cuposDisponibles === 0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formularioNuevo.apellido}
                    onChange={(e) => setFormularioNuevo({ ...formularioNuevo, apellido: e.target.value })}
                    placeholder="Ej: Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    disabled={cuposDisponibles === 0}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    DNI (opcional)
                  </label>
                  <input
                    type="text"
                    value={formularioNuevo.dni}
                    onChange={(e) => setFormularioNuevo({ ...formularioNuevo, dni: e.target.value })}
                    placeholder="Ej: 12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    disabled={cuposDisponibles === 0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="text"
                    value={formularioNuevo.phone}
                    onChange={(e) => setFormularioNuevo({ ...formularioNuevo, phone: e.target.value })}
                    placeholder="Ej: +54 11 1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    disabled={cuposDisponibles === 0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email (opcional, puede usar &quot;-&quot;)
                </label>
                <input
                  type="email"
                  value={formularioNuevo.email}
                  onChange={(e) => setFormularioNuevo({ ...formularioNuevo, email: e.target.value })}
                  placeholder="Ej: juan@email.com o -"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  disabled={cuposDisponibles === 0}
                />
              </div>
              <button
                onClick={inscribirNuevoAlumno}
                disabled={creandoNuevo || cuposDisponibles === 0 || !formularioNuevo.nombre || !formularioNuevo.apellido}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {creandoNuevo ? 'Inscribiendo...' : 'Inscribir Alumno'}
              </button>
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
                    <div className="flex-1">
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
                    <button
                      onClick={() => eliminarSuscriptor(suscriptor.id, suscriptor.userId)}
                      disabled={eliminando === suscriptor.id}
                      className="ml-4 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      title="Eliminar de esta clase"
                    >
                      {eliminando === suscriptor.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Eliminar'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de notificaciones */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        message={modal.message}
        type={modal.type}
        title={modal.title}
        showConfirm={modal.showConfirm}
        confirmText={modal.confirmText}
        onConfirm={modal.onConfirm}
      />
    </div>
  )
}

