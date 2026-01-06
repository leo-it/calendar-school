'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Clase, Profesor } from '@prisma/client'
import { Nivel, Estilo } from '@/types/enums'
import { generarUrlGoogleCalendar } from '@/lib/google-calendar'
import Modal from './Modal'
import { useModal } from './useModal'

interface ClaseConProfesor extends Clase {
  profesor: Profesor
  escuela?: {
    id: string
    nombre: string
    direccion?: string | null
    telefono?: string | null
    email?: string | null
    instagram?: string | null
    facebook?: string | null
    whatsapp?: string | null
    web?: string | null
  }
  fecha?: Date | string // Fecha específica de la ocurrencia (añadida por la API del calendario)
}

interface ModalClaseProps {
  clase: ClaseConProfesor | null
  usuarioId: string
  usuarioRole?: string
  esAdminEscuela?: boolean
  onClose: () => void
  onActualizada: () => void
}

export default function ModalClase({
  clase,
  usuarioId,
  usuarioRole,
  esAdminEscuela,
  onClose,
  onActualizada,
}: ModalClaseProps) {
  const [subscribiendo, setSubscribiendo] = useState(false)
  const [desubscribiendo, setDesubscribiendo] = useState(false)
  const [estaSubscrito, setEstaSubscrito] = useState(false)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [inscripciones, setInscripciones] = useState<{ inscritos: number; capacidad: number; cuposDisponibles: number } | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [eliminandoSuscriptor, setEliminandoSuscriptor] = useState<string | null>(null)
  const [mostrarAlumnos, setMostrarAlumnos] = useState(false)
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false)
  const [modoInscripcion, setModoInscripcion] = useState<'buscar' | 'nuevo'>('buscar')
  const [buscarUsuario, setBuscarUsuario] = useState('')
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<any[]>([])
  const [buscando, setBuscando] = useState(false)
  const [añadiendo, setAñadiendo] = useState<string | null>(null)
  const [formularioNuevo, setFormularioNuevo] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    phone: '',
  })
  const [creandoNuevo, setCreandoNuevo] = useState(false)
  const { modal, showModal, showConfirm, closeModal } = useModal()

  const puedeEditar = usuarioRole === 'ADMIN' || (usuarioRole === 'PROFESOR' && esAdminEscuela)
  const esProfesor = usuarioRole === 'PROFESOR'
  const claseIdReal = clase?.id.includes('-') ? clase.id.split('-')[0] : clase?.id || ''

  useEffect(() => {
    if (clase) {
      cargarInscripciones()
      if (esProfesor) {
        cargarAlumnos()
      }
      if (!puedeEditar) {
        verificarSubscripcion()
      } else {
        setCargandoEstado(false)
      }
    }
  }, [clase])

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

  const cargarAlumnos = async () => {
    if (!clase) return
    setCargandoAlumnos(true)
    try {
      // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
      let claseIdReal = clase.id
      let fechaClase: string | null = null
      
      if (clase.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        // Intentar extraer la fecha del formato "id-YYYY-MM-DD"
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      const url = fechaClase 
        ? `/api/clases/${claseIdReal}/subscriptions?fecha=${fechaClase}`
        : `/api/clases/${claseIdReal}/subscriptions`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAlumnos(data.suscriptores || [])
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error)
    } finally {
      setCargandoAlumnos(false)
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
        (u: any) => !alumnos.some(a => a.userId === u.id)
      )
      setUsuariosEncontrados(usuariosNoSuscritos)
    } catch (err) {
      console.error('Error al buscar usuarios:', err)
    } finally {
      setBuscando(false)
    }
  }

  const añadirUsuario = async (userId: string) => {
    if (!clase) return
    
    setAñadiendo(userId)
    try {
      let claseIdReal = clase.id
      let fechaClase: string | null = null
      
      if (clase.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      if (clase.fecha && !fechaClase) {
        const fecha = typeof clase.fecha === 'string' ? new Date(clase.fecha) : clase.fecha
        fechaClase = fecha.toISOString().split('T')[0]
      }

      const response = await fetch(`/api/clases/${claseIdReal}/subscriptions/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          fecha: fechaClase,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        showModal(data.error || 'Error al añadir usuario', 'error')
        return
      }

      await cargarAlumnos()
      await cargarInscripciones()
      setBuscarUsuario('')
      setUsuariosEncontrados([])
      onActualizada()
    } catch (err) {
        showModal('Error al añadir usuario', 'error')
    } finally {
      setAñadiendo(null)
    }
  }

  const inscribirNuevoAlumno = async () => {
    if (!clase || !formularioNuevo.nombre || !formularioNuevo.apellido) {
      showModal('El nombre y apellido son requeridos', 'warning')
      return
    }

    setCreandoNuevo(true)
    try {
      let claseIdReal = clase.id
      let fechaClase: string | null = null
      
      if (clase.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      if (clase.fecha && !fechaClase) {
        const fecha = typeof clase.fecha === 'string' ? new Date(clase.fecha) : clase.fecha
        fechaClase = fecha.toISOString().split('T')[0]
      }

      const response = await fetch(`/api/clases/${claseIdReal}/subscriptions/manual`, {
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

      await cargarAlumnos()
      await cargarInscripciones()
      setFormularioNuevo({ nombre: '', apellido: '', dni: '', email: '', phone: '' })
      setModoInscripcion('buscar')
      onActualizada()
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
        ejecutarEliminacionSuscriptor(subscriptionId, userId)
      },
      'warning',
      'Confirmar eliminación'
    )
  }

  const ejecutarEliminacionSuscriptor = async (subscriptionId: string, userId: string | null) => {
    setEliminandoSuscriptor(subscriptionId)
    try {
      let claseIdReal = clase?.id
      let fechaClase: string | null = null
      
      if (clase?.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      if (clase?.fecha && !fechaClase) {
        const fecha = typeof clase.fecha === 'string' ? new Date(clase.fecha) : clase.fecha
        fechaClase = fecha.toISOString().split('T')[0]
      }

      const response = await fetch(`/api/clases/${claseIdReal}/subscriptions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionId, 
          userId, // Pasar userId para asegurar la eliminación correcta
          fecha: fechaClase // Pasar la fecha para eliminar la suscripción exacta
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        showModal(data.error || 'Error al eliminar suscriptor', 'error')
        return
      }

      await cargarAlumnos()
      await cargarInscripciones()
      showModal('Alumno eliminado correctamente', 'success')
      if (onActualizada) {
        onActualizada()
      }
    } catch (err) {
      showModal('Error al eliminar suscriptor', 'error')
    } finally {
      setEliminandoSuscriptor(null)
    }
  }

  const cargarInscripciones = async () => {
    if (!clase) return
    try {
      // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
      let claseIdReal = clase.id
      let fechaClase: string | null = null
      
      if (clase.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        // Intentar extraer la fecha del formato "id-YYYY-MM-DD"
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      // Si la clase tiene fecha directamente, usarla
      if (clase.fecha && !fechaClase) {
        const fecha = typeof clase.fecha === 'string' ? new Date(clase.fecha) : clase.fecha
        fechaClase = fecha.toISOString().split('T')[0]
      }
      
      const url = fechaClase 
        ? `/api/clases/${claseIdReal}/subscriptions-count?fecha=${fechaClase}`
        : `/api/clases/${claseIdReal}/subscriptions-count`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setInscripciones(data)
      }
    } catch (error) {
      console.error('Error al cargar inscripciones:', error)
    }
  }

  const verificarSubscripcion = async () => {
    if (!clase) return
    try {
      // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
      let claseIdReal = clase.id
      let fechaClase: string | null = null
      
      if (clase.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        // Intentar extraer la fecha del formato "id-YYYY-MM-DD"
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      // Si la clase tiene fecha directamente, usarla
      if (clase.fecha && !fechaClase) {
        const fecha = typeof clase.fecha === 'string' ? new Date(clase.fecha) : clase.fecha
        fechaClase = fecha.toISOString().split('T')[0]
      }
      
      const url = fechaClase 
        ? `/api/clases/check-subscription?claseId=${claseIdReal}&fecha=${fechaClase}`
        : `/api/clases/check-subscription?claseId=${claseIdReal}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEstaSubscrito(data.isSubscribed)
      }
    } catch (error) {
      console.error('Error al verificar subscripción:', error)
    } finally {
      setCargandoEstado(false)
    }
  }

  const handleSubscribe = async () => {
    if (!clase) return
    setSubscribiendo(true)
    try {
      // Extraer el ID real de la clase y la fecha (puede ser compuesto como "id-fecha")
      let claseIdReal = clase.id
      let fechaClase: string | null = null
      
      if (clase.id.includes('-')) {
        const partes = clase.id.split('-')
        claseIdReal = partes[0]
        // Intentar extraer la fecha del formato "id-YYYY-MM-DD"
        if (partes.length >= 4) {
          fechaClase = `${partes[1]}-${partes[2]}-${partes[3]}`
        }
      }
      
      // Si la clase tiene fecha directamente, usarla
      if (clase.fecha && !fechaClase) {
        const fecha = typeof clase.fecha === 'string' ? new Date(clase.fecha) : clase.fecha
        fechaClase = fecha.toISOString().split('T')[0]
      }
      
      const response = await fetch('/api/clases/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          claseId: claseIdReal,
          fecha: fechaClase 
        }),
      })

      if (response.ok) {
        setEstaSubscrito(true)
        cargarInscripciones() // Actualizar conteo de inscripciones
        onActualizada()
      } else {
        const errorData = await response.json()
        let errorMessage = errorData.error || 'Error al subscribirse'
        
        // Si hay detalles, agregarlos
        if (errorData.details) {
          errorMessage = `${errorMessage}\n\n${errorData.details}`
        }
        
        showModal(errorMessage, 'error')
      }
    } catch (error) {
      console.error('Error al subscribirse:', error)
      showModal('Error al subscribirse', 'error')
    } finally {
      setSubscribiendo(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!clase) return
    showConfirm(
      '¿Estás seguro de que quieres darte de baja de esta clase?',
      () => {
        ejecutarDesuscripcion()
      },
      'warning',
      'Confirmar baja'
    )
  }

  const ejecutarDesuscripcion = async () => {
    setDesubscribiendo(true)
    try {
      // Extraer el ID real de la clase (puede ser compuesto como "id-fecha")
      const claseIdReal = clase.id.includes('-') ? clase.id.split('-')[0] : clase.id
      const response = await fetch('/api/clases/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claseId: claseIdReal }),
      })

      if (response.ok) {
        setEstaSubscrito(false)
        cargarInscripciones() // Actualizar conteo de inscripciones
        onActualizada()
      } else {
        const errorData = await response.json()
        let errorMessage = errorData.error || 'Error al darse de baja'
        
        // Si hay detalles, agregarlos
        if (errorData.details) {
          errorMessage = `${errorMessage}\n\n${errorData.details}`
        }
        
        showModal(errorMessage, 'error')
      }
    } catch (error) {
      console.error('Error al darse de baja:', error)
      showModal('Error al darse de baja', 'error')
    } finally {
      setDesubscribiendo(false)
    }
  }

  const handleDelete = async () => {
    if (!clase) return
    showConfirm(
      '¿Estás seguro de que quieres eliminar esta clase? Esto eliminará todas las ocurrencias recurrentes.',
      () => {
        ejecutarEliminacionClase()
      },
      'warning',
      'Confirmar eliminación',
      'Eliminar'
    )
  }

  const ejecutarEliminacionClase = async () => {
    setEliminando(true)
    try {
      const response = await fetch(`/api/clases/${claseIdReal}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showModal('Clase eliminada correctamente', 'success')
        setTimeout(() => {
          onActualizada()
          onClose()
        }, 1500)
      } else {
        const error = await response.json()
        showModal(error.error || 'Error al eliminar la clase', 'error')
      }
    } catch (error) {
      console.error('Error al eliminar clase:', error)
      showModal('Error al eliminar la clase', 'error')
    } finally {
      setEliminando(false)
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

  if (!clase) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{clase.titulo}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {!clase.activa && (
            <div className="mb-4 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Esta clase está inactiva</p>
            </div>
          )}

          {clase.descripcion && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h3>
              <p className="text-gray-600">{clase.descripcion}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Fecha</h3>
                <p className="text-gray-900">
                  {clase.fecha 
                    ? format(parseISO(clase.fecha.toString()), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                    : 'Fecha no especificada'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Horario</h3>
                <p className="text-gray-900">{clase.horaInicio} - {clase.horaFin}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Profesor</h3>
                <p className="text-gray-900">{clase.profesor.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Lugar</h3>
                <p className="text-gray-900">{clase.lugar}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Capacidad</h3>
              {inscripciones ? (
                <div className="space-y-1">
                  <p className="text-gray-900">
                    <span className="font-semibold">{inscripciones.inscritos}</span> / {inscripciones.capacidad} estudiantes
                  </p>
                  {inscripciones.cuposDisponibles > 0 ? (
                    <p className="text-sm text-green-600 font-medium">
                      {inscripciones.cuposDisponibles} cupo{inscripciones.cuposDisponibles !== 1 ? 's' : ''} disponible{inscripciones.cuposDisponibles !== 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">
                      Clase llena
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900">{clase.capacidad} estudiantes</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${getNivelColor(clase.nivel)}`}>
              {clase.nivel.charAt(0) + clase.nivel.slice(1).toLowerCase()}
            </span>
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${getEstiloColor(clase.estilo)}`}>
              {clase.estilo.replace('_', ' ').charAt(0) + clase.estilo.replace('_', ' ').slice(1).toLowerCase()}
            </span>
          </div>

          {/* Sección de Alumnos para Profesores */}
          {esProfesor && clase.activa && (
            <div className="mb-6 border-t pt-4">
              <button
                onClick={() => setMostrarAlumnos(!mostrarAlumnos)}
                className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="font-semibold text-gray-900">
                  Alumnos Inscritos ({alumnos.length})
                </span>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${mostrarAlumnos ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {mostrarAlumnos && (
                <div className="mt-4 space-y-4">
                  {cargandoAlumnos ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    </div>
                  ) : (
                    <>
                      {alumnos.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No hay alumnos inscritos aún
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {alumnos.map((alumno) => (
                            <div
                              key={alumno.id}
                              className="bg-white border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {alumno.name || 'Sin nombre'}
                                    {alumno.apellido && ` ${alumno.apellido}`}
                                  </p>
                                  {alumno.dni && (
                                    <p className="text-xs text-gray-500 mt-1">DNI: {alumno.dni}</p>
                                  )}
                                  {alumno.email && (
                                    <p className="text-xs text-gray-500">{alumno.email}</p>
                                  )}
                                  {alumno.phone && (
                                    <p className="text-xs text-gray-400 mt-1">{alumno.phone}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => eliminarSuscriptor(alumno.id, alumno.userId)}
                                  disabled={eliminandoSuscriptor === alumno.id}
                                  className="ml-4 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                  title="Eliminar de esta clase"
                                >
                                  {eliminandoSuscriptor === alumno.id ? (
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

                      {/* Formulario para agregar nuevo alumno */}
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModoInscripcion('buscar')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                              modoInscripcion === 'buscar'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
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
                          >
                            Inscribir Nuevo
                          </button>
                        </div>

                        {modoInscripcion === 'buscar' ? (
                          <>
                            <label className="block text-sm font-medium text-gray-700">
                              Buscar estudiante registrado
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={buscarUsuario}
                                onChange={(e) => setBuscarUsuario(e.target.value)}
                                placeholder="Ej: Juan Pérez o juan@email.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              {buscando && (
                                <div className="absolute right-3 top-2.5">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                                </div>
                              )}
                            </div>

                            {/* Lista de usuarios encontrados */}
                            {usuariosEncontrados.length > 0 && (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                                      disabled={añadiendo === usuario.id}
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
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Email (opcional, puede usar "-")
                              </label>
                              <input
                                type="email"
                                value={formularioNuevo.email}
                                onChange={(e) => setFormularioNuevo({ ...formularioNuevo, email: e.target.value })}
                                placeholder="Ej: juan@email.com o -"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              />
                            </div>
                            <button
                              onClick={inscribirNuevoAlumno}
                              disabled={creandoNuevo || !formularioNuevo.nombre || !formularioNuevo.apellido}
                              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                              {creandoNuevo ? 'Inscribiendo...' : 'Inscribir Alumno'}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="border-t pt-4 space-y-3">
            {/* Botón de Google Calendar - siempre visible si la clase está activa */}
            {clase.activa && (
              <button
                onClick={() => {
                  const url = generarUrlGoogleCalendar(clase)
                  window.open(url, '_blank')
                }}
                className="w-full py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                </svg>
                Agregar a Google Calendar
              </button>
            )}

            {puedeEditar ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    window.location.href = `/clases/${claseIdReal}/editar`
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={eliminando}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                >
                  {eliminando ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            ) : clase.activa && (
              <>
                {cargandoEstado ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  </div>
                ) : estaSubscrito ? (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={desubscribiendo}
                    className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                  >
                    {desubscribiendo ? 'Dándose de baja...' : 'Darse de baja'}
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribiendo}
                    className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50"
                  >
                    {subscribiendo ? 'Subscribiendo...' : 'Inscribirse a esta clase'}
                  </button>
                )}
              </>
            )}
          </div>
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

