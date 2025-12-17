'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Profesor } from '@prisma/client'
import { Nivel, Estilo } from '@/types/enums'

export default function EditarClaseClient({ 
  claseId, 
  user 
}: { 
  claseId: string
  user: { id: string; email: string; name?: string | null; role: string } 
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [profesorBuscado, setProfesorBuscado] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    diaSemana: '1',
    horaInicio: '',
    horaFin: '',
    nivel: 'PRINCIPIANTE' as Nivel,
    estilo: 'CONTEMPORANEO' as Estilo,
    lugar: '',
    capacidad: 20,
    profesorId: '',
    fechaInicio: '',
    fechaFin: '',
    activa: true,
  })
  const [lugarOtro, setLugarOtro] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [claseId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [claseResponse, profesoresResponse] = await Promise.all([
        fetch(`/api/clases/${claseId}`),
        fetch('/api/profesores'),
      ])

      if (!claseResponse.ok) {
        throw new Error('Clase no encontrada')
      }

      const clase = await claseResponse.json()
      const profesoresData = await profesoresResponse.json()
      
      setProfesores(profesoresData)
      
      // Cargar datos de la clase
      setFormData({
        titulo: clase.titulo || '',
        descripcion: clase.descripcion || '',
        diaSemana: clase.diaSemana?.toString() || '1',
        horaInicio: clase.horaInicio || '',
        horaFin: clase.horaFin || '',
        nivel: clase.nivel || 'PRINCIPIANTE',
        estilo: clase.estilo || 'CONTEMPORANEO',
        lugar: clase.lugar || '',
        capacidad: clase.capacidad || 20,
        profesorId: clase.profesorId || '',
        fechaInicio: clase.fechaInicio ? new Date(clase.fechaInicio).toISOString().split('T')[0] : '',
        fechaFin: clase.fechaFin ? new Date(clase.fechaFin).toISOString().split('T')[0] : '',
        activa: clase.activa !== undefined ? clase.activa : true,
      })

      // Cargar nombre del profesor si existe (después de cargar profesores)
      if (clase.profesorId && profesoresData.length > 0) {
        const profesorEncontrado = profesoresData.find(p => p.id === clase.profesorId)
        if (profesorEncontrado) {
          setProfesorBuscado(profesorEncontrado.name)
        }
      }

      if (clase.lugar && !['Duo Tricks', 'La Central', 'Otro'].includes(clase.lugar)) {
        setLugarOtro(clase.lugar)
        setFormData(prev => ({ ...prev, lugar: 'Otro' }))
      }
    } catch (error: any) {
      setError(error.message || 'Error al cargar la clase')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const lugarFinal = formData.lugar === 'Otro' ? lugarOtro : formData.lugar
      
      const response = await fetch(`/api/clases/${claseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          lugar: lugarFinal,
          fechaInicio: formData.fechaInicio || null,
          fechaFin: formData.fechaFin || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar la clase')
      }

      router.push('/calendario')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la clase')
    } finally {
      setSaving(false)
    }
  }

  const niveles: Nivel[] = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO']
  const estilos: Estilo[] = ['CONTEMPORANEO', 'JAZZ', 'BALLET', 'HIP_HOP', 'URBANO', 'OTRO']
  const lugaresComunes = ['Duo Tricks', 'La Central', 'Otro']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-500">Cargando clase...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Clase</h1>
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
              </div>

              {/* Lugar */}
              <div>
                <label htmlFor="lugar" className="block text-sm font-medium text-gray-700 mb-1">
                  Lugar *
                </label>
                <select
                  id="lugar"
                  required
                  value={formData.lugar}
                  onChange={(e) => {
                    if (e.target.value !== 'Otro') {
                      setFormData({ ...formData, lugar: e.target.value })
                      setLugarOtro('')
                    } else {
                      setFormData({ ...formData, lugar: 'Otro' })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Seleccionar lugar</option>
                  {lugaresComunes.map((lugar) => (
                    <option key={lugar} value={lugar}>
                      {lugar}
                    </option>
                  ))}
                </select>
                {formData.lugar === 'Otro' && (
                  <input
                    type="text"
                    placeholder="Especificar lugar"
                    required
                    value={lugarOtro}
                    onChange={(e) => {
                      setLugarOtro(e.target.value)
                      setFormData({ ...formData, lugar: e.target.value })
                    }}
                    className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                )}
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
                <select
                  id="estilo"
                  required
                  value={formData.estilo}
                  onChange={(e) => setFormData({ ...formData, estilo: e.target.value as Estilo })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  {estilos.map((estilo) => (
                    <option key={estilo} value={estilo}>
                      {estilo.replace('_', ' ').charAt(0) + estilo.replace('_', ' ').slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profesor */}
              <div className="relative">
                <label htmlFor="profesorId" className="block text-sm font-medium text-gray-700 mb-1">
                  Profesor *
                </label>
                <input
                  id="profesorId"
                  type="text"
                  required
                  value={profesorBuscado}
                  onChange={(e) => {
                    const valor = e.target.value
                    setProfesorBuscado(valor)
                    setMostrarSugerencias(true)
                    // Buscar profesor por nombre
                    const profesorEncontrado = profesores.find(
                      p => p.name.toLowerCase() === valor.toLowerCase()
                    )
                    if (profesorEncontrado) {
                      setFormData({ ...formData, profesorId: profesorEncontrado.id })
                    } else {
                      setFormData({ ...formData, profesorId: '' })
                    }
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                  placeholder="Escribe el nombre del profesor"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
                {mostrarSugerencias && profesores.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {profesores
                      .filter(p => 
                        !profesorBuscado || 
                        p.name.toLowerCase().includes(profesorBuscado.toLowerCase())
                      )
                      .map((profesor) => (
                        <button
                          key={profesor.id}
                          type="button"
                          onClick={() => {
                            setProfesorBuscado(profesor.name)
                            setFormData({ ...formData, profesorId: profesor.id })
                            setMostrarSugerencias(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          {profesor.name}
                        </button>
                      ))}
                  </div>
                )}
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
            </div>

            {/* Estado activo */}
            <div className="flex items-center">
              <input
                id="activa"
                type="checkbox"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="activa" className="ml-2 block text-sm text-gray-700">
                Clase activa
              </label>
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
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}



