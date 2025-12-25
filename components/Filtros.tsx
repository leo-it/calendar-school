'use client'

import { Profesor } from '@prisma/client'
import { Nivel } from '@/types/enums'

interface FiltrosProps {
  profesores: Profesor[]
  filtroProfesor: string
  filtroNivel: Nivel | 'todos'
  filtroEstilo: string | 'todos'
  filtroLugar: string
  lugares: string[]
  estilos: string[] // Estilos únicos de las clases en la BD
  onProfesorChange: (value: string) => void
  onNivelChange: (value: Nivel | 'todos') => void
  onEstiloChange: (value: string | 'todos') => void
  onLugarChange: (value: string) => void
}

export default function Filtros({
  profesores,
  filtroProfesor,
  filtroNivel,
  filtroEstilo,
  filtroLugar,
  lugares,
  estilos,
  onProfesorChange,
  onNivelChange,
  onEstiloChange,
  onLugarChange,
}: FiltrosProps) {
  const niveles: (Nivel | 'todos')[] = ['todos', 'PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO']

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Filtros</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro Profesor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profesor
          </label>
          <select
            value={filtroProfesor}
            onChange={(e) => onProfesorChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
          >
            <option value="todos">Todos</option>
            {profesores.map((profesor) => (
              <option key={profesor.id} value={profesor.id}>
                {profesor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Nivel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nivel
          </label>
          <select
            value={filtroNivel}
            onChange={(e) => onNivelChange(e.target.value as Nivel | 'todos')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
          >
            {niveles.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel === 'todos' ? 'Todos' : nivel.charAt(0) + nivel.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Estilo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estilo
          </label>
          <select
            value={filtroEstilo}
            onChange={(e) => onEstiloChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
          >
            <option value="todos">Todos</option>
            {estilos.map((estilo) => (
              <option key={estilo} value={estilo}>
                {estilo}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Lugar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lugar
          </label>
          <select
            value={filtroLugar}
            onChange={(e) => onLugarChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
          >
            <option value="todos">Todos</option>
            {lugares.map((lugar) => (
              <option key={lugar} value={lugar}>
                {lugar}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

