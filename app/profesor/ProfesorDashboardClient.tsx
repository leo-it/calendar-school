'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ModalSuscriptores from '@/components/ModalSuscriptores'

interface Clase {
  id: string
  titulo: string
  descripcion?: string | null
  diaSemana: number
  horaInicio: string
  horaFin: string
  nivel: string
  estilo: string
  lugar: string
  capacidad: number
  activa: boolean
  profesor: {
    id: string
    name: string
  }
  escuela: {
    id: string
    nombre: string
  }
}

export default function ProfesorDashboardClient({ user }: { user: { id: string; email: string; name?: string | null; role: string } }) {
  const router = useRouter()
  const [clases, setClases] = useState<Clase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [claseSeleccionada, setClaseSeleccionada] = useState<Clase | null>(null)
  const [mostrarInfoContacto, setMostrarInfoContacto] = useState(false)
  const [infoEscuela, setInfoEscuela] = useState<any>(null)
  const [editandoInfo, setEditandoInfo] = useState(false)
  const [guardandoInfo, setGuardandoInfo] = useState(false)
  const [formInfoEscuela, setFormInfoEscuela] = useState({
    direccion: '',
    telefono: '',
    email: '',
    instagram: '',
    facebook: '',
    whatsapp: '',
    web: '',
  })

  useEffect(() => {
    cargarClases()
    cargarInfoEscuela()
  }, [])

  const cargarInfoEscuela = async () => {
    try {
      const response = await fetch('/api/escuelas')
      if (response.ok) {
        const escuelas = await response.json()
        if (escuelas.length > 0) {
          const escuela = escuelas[0] // El profesor solo ve su escuela
          setInfoEscuela(escuela)
          setFormInfoEscuela({
            direccion: escuela.direccion || '',
            telefono: escuela.telefono || '',
            email: escuela.email || '',
            instagram: escuela.instagram || '',
            facebook: escuela.facebook || '',
            whatsapp: escuela.whatsapp || '',
            web: escuela.web || '',
          })
        }
      }
    } catch (err) {
      console.error('Error al cargar información de escuela:', err)
    }
  }

  const handleGuardarInfoEscuela = async () => {
    if (!infoEscuela) return
    
    setGuardandoInfo(true)
    try {
      const response = await fetch(`/api/escuelas/${infoEscuela.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formInfoEscuela),
      })

      if (response.ok) {
        await cargarInfoEscuela()
        setEditandoInfo(false)
        alert('Información de contacto actualizada correctamente')
      } else {
        const data = await response.json()
        alert(data.error || 'Error al actualizar información')
      }
    } catch (err) {
      alert('Error al guardar información')
    } finally {
      setGuardandoInfo(false)
    }
  }

  const cargarClases = async () => {
    setLoading(true)
    try {
      // Obtener todas las clases y filtrar por las de la escuela del profesor
      const response = await fetch('/api/clases?inicio=2024-01-01&fin=2024-12-31')
      if (response.ok) {
        const data = await response.json()
        // Agrupar por clase base (sin duplicados de fechas)
        const clasesUnicas = new Map<string, Clase>()
        data.forEach((clase: any) => {
          const baseId = clase.id.split('-')[0]
          if (!clasesUnicas.has(baseId)) {
            clasesUnicas.set(baseId, clase)
          }
        })
        setClases(Array.from(clasesUnicas.values()))
      } else {
        setError('Error al cargar clases')
      }
    } catch (err) {
      setError('Error al cargar clases')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminarClase = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta clase?')) return

    try {
      const response = await fetch(`/api/clases/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al eliminar clase')
        return
      }

      cargarClases()
    } catch (err) {
      setError('Error al eliminar clase')
    }
  }

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Profesor</h1>
            <div className="flex gap-4">
              <Link
                href="/calendario"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Calendario
              </Link>
              <Link
                href="/clases/nueva"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Nueva Clase
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de Contacto de la Escuela */}
        {infoEscuela && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-900 font-semibold">Información de Contacto</h2>
              <button
                onClick={() => {
                  setEditandoInfo(!editandoInfo)
                  if (editandoInfo) {
                    // Resetear formulario si cancela
                    setFormInfoEscuela({
                      direccion: infoEscuela.direccion || '',
                      telefono: infoEscuela.telefono || '',
                      email: infoEscuela.email || '',
                      instagram: infoEscuela.instagram || '',
                      facebook: infoEscuela.facebook || '',
                      whatsapp: infoEscuela.whatsapp || '',
                      web: infoEscuela.web || '',
                    })
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                {editandoInfo ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editandoInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formInfoEscuela.direccion}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, direccion: e.target.value })}
                      placeholder="Ej: Calle Principal 123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={formInfoEscuela.telefono}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, telefono: e.target.value })}
                      placeholder="Ej: +54 11 1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formInfoEscuela.email}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, email: e.target.value })}
                      placeholder="Ej: contacto@escuela.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formInfoEscuela.whatsapp}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, whatsapp: e.target.value })}
                      placeholder="Ej: +54 11 1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={formInfoEscuela.instagram}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, instagram: e.target.value })}
                      placeholder="Ej: @escueladedanza"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook
                    </label>
                    <input
                      type="text"
                      value={formInfoEscuela.facebook}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, facebook: e.target.value })}
                      placeholder="Ej: /escueladedanza"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sitio Web
                    </label>
                    <input
                      type="url"
                      value={formInfoEscuela.web}
                      onChange={(e) => setFormInfoEscuela({ ...formInfoEscuela, web: e.target.value })}
                      placeholder="Ej: https://www.escueladedanza.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleGuardarInfoEscuela}
                    disabled={guardandoInfo}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {guardandoInfo ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {infoEscuela.direccion && (
                  <div>
                    <span className="font-medium text-gray-700">Dirección:</span>
                    <p className="text-gray-600">{infoEscuela.direccion}</p>
                  </div>
                )}
                {infoEscuela.telefono && (
                  <div>
                    <span className="font-medium text-gray-700">Teléfono:</span>
                    <p className="text-gray-600">{infoEscuela.telefono}</p>
                  </div>
                )}
                {infoEscuela.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-600">{infoEscuela.email}</p>
                  </div>
                )}
                {infoEscuela.whatsapp && (
                  <div>
                    <span className="font-medium text-gray-700">WhatsApp:</span>
                    <p className="text-gray-600">{infoEscuela.whatsapp}</p>
                  </div>
                )}
                {infoEscuela.instagram && (
                  <div>
                    <span className="font-medium text-gray-700">Instagram:</span>
                    <p className="text-gray-600">{infoEscuela.instagram}</p>
                  </div>
                )}
                {infoEscuela.facebook && (
                  <div>
                    <span className="font-medium text-gray-700">Facebook:</span>
                    <p className="text-gray-600">{infoEscuela.facebook}</p>
                  </div>
                )}
                {infoEscuela.web && (
                  <div>
                    <span className="font-medium text-gray-700">Sitio Web:</span>
                    <p className="text-gray-600">{infoEscuela.web}</p>
                  </div>
                )}
                {!infoEscuela.direccion && !infoEscuela.telefono && !infoEscuela.email && 
                 !infoEscuela.whatsapp && !infoEscuela.instagram && !infoEscuela.facebook && !infoEscuela.web && (
                  <p className="text-gray-500 text-sm">No hay información de contacto configurada. Haz clic en "Editar" para agregar.</p>
                )}
              </div>
            )}
          </div>
        )}

        <h2 className="text-xl font-semibold mb-4">Mis Clases</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : clases.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tienes clases creadas. <Link href="/clases/nueva" className="text-primary-600 hover:text-primary-700">Crea una nueva clase</Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estilo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lugar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clases.map((clase) => (
                  <tr key={clase.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={() => setClaseSeleccionada(clase)}
                        className="text-primary-600 hover:text-primary-900 hover:underline cursor-pointer"
                      >
                        {clase.titulo}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {diasSemana[clase.diaSemana]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clase.horaInicio} - {clase.horaFin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clase.nivel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clase.estilo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clase.lugar}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clase.capacidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        clase.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {clase.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/clases/${clase.id}/editar`}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleEliminarClase(clase.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Suscriptores */}
      {claseSeleccionada && (
        <ModalSuscriptores
          claseId={claseSeleccionada.id}
          claseTitulo={claseSeleccionada.titulo}
          capacidad={claseSeleccionada.capacidad}
          onClose={() => setClaseSeleccionada(null)}
          onActualizada={() => {
            cargarClases()
          }}
        />
      )}
    </div>
  )
}






