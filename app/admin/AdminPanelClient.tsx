'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Escuela {
  id: string
  nombre: string
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  activa: boolean
}

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

interface Invitacion {
  id: string
  codigo: string
  escuelaId?: string | null
  usado: boolean
  usadoPor?: string | null
  usadoEn?: string | null
  expiraEn?: string | null
  createdAt: string
  escuela?: Escuela | null
}

export default function AdminPanelClient({ user }: { user: { id: string; email: string; name?: string | null; role: string; esAdminEscuela?: boolean } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'escuelas' | 'clases' | 'invitaciones'>('escuelas')
  const [escuelas, setEscuelas] = useState<Escuela[]>([])
  const [clases, setClases] = useState<Clase[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Estados para formularios
  const [showEscuelaForm, setShowEscuelaForm] = useState(false)
  const [editingEscuela, setEditingEscuela] = useState<Escuela | null>(null)
  const [escuelaForm, setEscuelaForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    activa: true,
  })
  const [showInvitacionForm, setShowInvitacionForm] = useState(false)
  const [invitacionForm, setInvitacionForm] = useState({
    escuelaId: '',
    diasValidez: 30,
  })
  const [escuelaUsuario, setEscuelaUsuario] = useState<Escuela | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [activeTab])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      if (activeTab === 'escuelas') {
        const response = await fetch('/api/escuelas')
        if (response.ok) {
          const data = await response.json()
          setEscuelas(data)
        }
      } else if (activeTab === 'clases') {
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
        }
      } else if (activeTab === 'invitaciones') {
        const response = await fetch('/api/invitaciones')
        if (response.ok) {
          const data = await response.json()
          setInvitaciones(data)
        } else {
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.error || 'Error al cargar invitaciones')
        }
      }
    } catch (err) {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleEscuelaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const url = editingEscuela 
        ? `/api/escuelas/${editingEscuela.id}`
        : '/api/escuelas'
      const method = editingEscuela ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escuelaForm),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al guardar escuela')
        return
      }

      setShowEscuelaForm(false)
      setEditingEscuela(null)
      setEscuelaForm({ nombre: '', direccion: '', telefono: '', email: '', activa: true })
      cargarDatos()
    } catch (err) {
      setError('Error al guardar escuela')
    }
  }

  const handleEliminarEscuela = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta escuela?')) return

    try {
      const response = await fetch(`/api/escuelas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Error al eliminar escuela')
        return
      }

      cargarDatos()
    } catch (err) {
      setError('Error al eliminar escuela')
    }
  }

  const handleEditarEscuela = (escuela: Escuela) => {
    setEditingEscuela(escuela)
    setEscuelaForm({
      nombre: escuela.nombre,
      direccion: escuela.direccion || '',
      telefono: escuela.telefono || '',
      email: escuela.email || '',
      activa: escuela.activa,
    })
    setShowEscuelaForm(true)
  }

  const handleCrearInvitacion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const expiraEn = new Date()
      expiraEn.setDate(expiraEn.getDate() + invitacionForm.diasValidez)

      const response = await fetch('/api/invitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escuelaId: invitacionForm.escuelaId || undefined,
          expiraEn: expiraEn.toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al crear invitación')
        return
      }

      setShowInvitacionForm(false)
      setInvitacionForm({ escuelaId: '', diasValidez: 30 })
      cargarDatos()
    } catch (err) {
      setError('Error al crear invitación')
    }
  }

  const eliminarClase = async (claseId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta clase? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch(`/api/clases/${claseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al eliminar clase')
        return
      }

      // Recargar las clases después de eliminar
      cargarDatos()
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
            <h1 className="text-2xl font-bold text-gray-900">
              {user.role === 'ADMIN' ? 'Panel de Administración' : 'Panel de Gestión de Escuela'}
            </h1>
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
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {user.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('escuelas')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'escuelas'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Escuelas
              </button>
            )}
            <button
              onClick={() => setActiveTab('clases')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clases'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Clases
            </button>
            <button
              onClick={() => setActiveTab('invitaciones')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitaciones'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invitaciones Profesores
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {activeTab === 'escuelas' && user.role === 'ADMIN' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-900 font-semibold">Gestión de Escuelas</h2>
              <button
                onClick={() => {
                  setShowEscuelaForm(true)
                  setEditingEscuela(null)
                  setEscuelaForm({ nombre: '', direccion: '', telefono: '', email: '', activa: true })
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Nueva Escuela
              </button>
            </div>

            {showEscuelaForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingEscuela ? 'Editar Escuela' : 'Nueva Escuela'}
                </h3>
                <form onSubmit={handleEscuelaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={escuelaForm.nombre}
                      onChange={(e) => setEscuelaForm({ ...escuelaForm, nombre: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={escuelaForm.direccion}
                      onChange={(e) => setEscuelaForm({ ...escuelaForm, direccion: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={escuelaForm.telefono}
                      onChange={(e) => setEscuelaForm({ ...escuelaForm, telefono: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={escuelaForm.email}
                      onChange={(e) => setEscuelaForm({ ...escuelaForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="activa"
                      checked={escuelaForm.activa}
                      onChange={(e) => setEscuelaForm({ ...escuelaForm, activa: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="activa" className="ml-2 text-sm text-gray-700">
                      Activa
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      {editingEscuela ? 'Actualizar' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEscuelaForm(false)
                        setEditingEscuela(null)
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {escuelas.map((escuela) => (
                      <tr key={escuela.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {escuela.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {escuela.direccion || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {escuela.telefono || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {escuela.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            escuela.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {escuela.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditarEscuela(escuela)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminarEscuela(escuela.id)}
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
        )}

        {activeTab === 'clases' && (
          <div>
            <h2 className="text-xl text-gray-900  font-semibold mb-4">Todas las Clases</h2>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profesor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clases.map((clase) => (
                      <tr key={clase.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {clase.titulo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {diasSemana[clase.diaSemana]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {clase.horaInicio} - {clase.horaFin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {clase.profesor.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {clase.escuela?.nombre || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-3">
                            <Link
                              href={`/clases/${clase.id}/editar`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Editar
                            </Link>
                            <button
                              onClick={() => eliminarClase(clase.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitaciones' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-900 font-semibold">Códigos de Invitación para Profesores</h2>
              <button
                onClick={() => {
                  setShowInvitacionForm(true)
                  setInvitacionForm({ escuelaId: '', diasValidez: 30 })
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Generar Código
              </button>
            </div>

            {showInvitacionForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-4">Nueva Invitación</h3>
                <form onSubmit={handleCrearInvitacion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Escuela {user.role === 'PROFESOR' && user.esAdminEscuela ? '(tu escuela)' : '(opcional)'}
                    </label>
                    {user.role === 'PROFESOR' && user.esAdminEscuela && escuelaUsuario ? (
                      <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900">
                        {escuelaUsuario.nombre}
                      </div>
                    ) : (
                      <select
                        value={invitacionForm.escuelaId}
                        onChange={(e) => setInvitacionForm({ ...invitacionForm, escuelaId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Sin escuela específica</option>
                        {escuelas
                          .filter((e) => e.activa)
                          .map((escuela) => (
                            <option key={escuela.id} value={escuela.id}>
                              {escuela.nombre}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Días de validez
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={invitacionForm.diasValidez}
                      onChange={(e) => setInvitacionForm({ ...invitacionForm, diasValidez: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Generar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInvitacionForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invitaciones.map((invitacion) => {
                      const expirado = invitacion.expiraEn && new Date(invitacion.expiraEn) < new Date()
                      return (
                        <tr key={invitacion.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">
                              {invitacion.codigo}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invitacion.escuela?.nombre || 'Cualquier escuela'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invitacion.usado ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                Usado
                              </span>
                            ) : expirado ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                Expirado
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                Activo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invitacion.expiraEn
                              ? new Date(invitacion.expiraEn).toLocaleDateString('es-AR')
                              : 'Sin expiración'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invitacion.createdAt).toLocaleDateString('es-AR')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {invitaciones.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay códigos de invitación generados
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

