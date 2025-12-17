'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    cargarClases()
  }, [])

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
                      {clase.titulo}
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
    </div>
  )
}






