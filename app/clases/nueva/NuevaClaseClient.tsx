'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Nivel } from '@/types/enums'

export default function NuevaClaseClient({ user }: { user: { id: string; email: string; name?: string | null; role: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nombreEscuela, setNombreEscuela] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    diaSemana: '1', // 1 = Lunes por defecto
    horaInicio: '',
    horaFin: '',
    nivel: 'PRINCIPIANTE' as Nivel,
    estilo: '',
    capacidad: 20,
    profesorNombre: '',
    fechaInicio: '',
    fechaFin: '',
  })

  useEffect(() => {
    cargarNombreEscuela()
  }, [])

  const cargarNombreEscuela = async () => {
    try {
      if (session?.user?.escuelaId) {
        const response = await fetch(`/api/escuelas/${session.user.escuelaId}`)
        if (response.ok) {
          const escuela = await response.json()
          setNombreEscuela(escuela.nombre)
        }
      }
    } catch (error) {
      console.error('Error al cargar nombre de escuela:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validar que el nombre del profesor esté ingresado
      if (!formData.profesorNombre || formData.profesorNombre.trim() === '') {
        setError('Debes ingresar el nombre del profesor')
        setLoading(false)
        return
      }

      if (!formData.estilo) {
        setError('El estilo es requerido')
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/clases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          estilo: formData.estilo,
          profesorNombre: formData.profesorNombre.trim(),
          fechaInicio: formData.fechaInicio || null,
          fechaFin: formData.fechaFin || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error al crear la clase'
        const errorDetails = errorData.details ? ` (${errorData.details})` : ''
        throw new Error(errorMessage + errorDetails)
      }

      // Redirigir al calendario después de crear
      router.push('/calendario')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear la clase')
    } finally {
      setLoading(false)
    }
  }

  const niveles: Nivel[] = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nueva Clase</h1>
              <p className="text-sm text-gray-500">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Panel Admin
                </button>
              )}
              <button
                onClick={() => router.push('/calendario')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                ← Volver al Calendario
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                Título de la Clase *
              </label>
              <input
                id="titulo"
                type="text"
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                placeholder="Ej: Danza Contemporánea - Principiantes"
              />
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                placeholder="Descripción de la clase..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Día de la Semana */}
              <div>
                <label htmlFor="diaSemana" className="block text-sm font-medium text-gray-700 mb-1">
                  Día de la Semana *
                </label>
                <select
                  id="diaSemana"
                  required
                  value={formData.diaSemana}
                  onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  <option value="0">Domingo</option>
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                  <option value="6">Sábado</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  La clase se repetirá todos los {['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][parseInt(formData.diaSemana)]}
                </p>
              </div>

              {/* Hora Inicio */}
              <div>
                <label htmlFor="horaInicio" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Inicio *
                </label>
                <input
                  id="horaInicio"
                  type="time"
                  required
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Hora Fin */}
              <div>
                <label htmlFor="horaFin" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Fin *
                </label>
                <input
                  id="horaFin"
                  type="time"
                  required
                  value={formData.horaFin}
                  onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Nivel */}
              <div>
                <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel *
                </label>
                <select
                  id="nivel"
                  required
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value as Nivel })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  {niveles.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel.charAt(0) + nivel.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estilo */}
              <div>
                <label htmlFor="estilo" className="block text-sm font-medium text-gray-700 mb-1">
                  Estilo *
                </label>
                <input
                  id="estilo"
                  type="text"
                  required
                  value={formData.estilo}
                  onChange={(e) => setFormData({ ...formData, estilo: e.target.value })}
                  placeholder="Ej: Contemporáneo, Jazz, Ballet, Hip Hop..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Profesor */}
              <div>
                <label htmlFor="profesorNombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Profesor *
                </label>
                <input
                  id="profesorNombre"
                  type="text"
                  required
                  value={formData.profesorNombre}
                  onChange={(e) => setFormData({ ...formData, profesorNombre: e.target.value })}
                  placeholder="Escribe el nombre del profesor"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Capacidad */}
              <div>
                <label htmlFor="capacidad" className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad *
                </label>
                <input
                  id="capacidad"
                  type="number"
                  required
                  min="1"
                  value={formData.capacidad}
                  onChange={(e) => setFormData({ ...formData, capacidad: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Escuela */}
              {(user.role === 'PROFESOR' || (user.role === 'ADMIN' && session?.user?.escuelaId)) && nombreEscuela && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escuela
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900">
                    {nombreEscuela}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    La clase se creará para esta escuela
                  </p>
                </div>
              )}
            </div>

            {/* Fechas opcionales de inicio y fin */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Fechas de Recurrencia (Opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio (opcional)
                  </label>
                  <input
                    id="fechaInicio"
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">Si se especifica, la clase comenzará desde esta fecha</p>
                </div>
                <div>
                  <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Fin (opcional)
                  </label>
                  <input
                    id="fechaFin"
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">Si se especifica, la clase terminará en esta fecha</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/calendario')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Clase'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

