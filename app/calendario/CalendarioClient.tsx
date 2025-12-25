'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale/es'
import Filtros from '@/components/Filtros'
import VistaCalendario from '@/components/VistaCalendario'
import { Clase, Profesor } from '@prisma/client'
import { Nivel, Estilo } from '@/types/enums'

type Vista = 'dia' | 'semana'

interface ClaseConProfesor extends Clase {
  profesor: Profesor
  fecha?: Date | string // Fecha específica de la ocurrencia (añadida por la API del calendario)
}

export default function CalendarioClient({ user }: { user: { id: string; email: string; name?: string | null; role: string; esAdminEscuela?: boolean } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [vista, setVista] = useState<Vista>('semana')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date())
  const [clases, setClases] = useState<ClaseConProfesor[]>([])
  const [clasesFiltradas, setClasesFiltradas] = useState<ClaseConProfesor[]>([])
  const [loading, setLoading] = useState(true)
  const [errorClases, setErrorClases] = useState('')
  const [menuAbierto, setMenuAbierto] = useState(false)
  
  // Filtros
  const [filtroProfesor, setFiltroProfesor] = useState<string>('todos')
  const [filtroNivel, setFiltroNivel] = useState<Nivel | 'todos'>('todos')
  const [filtroEstilo, setFiltroEstilo] = useState<string | 'todos'>('todos')
  const [filtroLugar, setFiltroLugar] = useState<string>('todos')
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [nombreEscuela, setNombreEscuela] = useState<string | null>(null)

  const cargarClases = useCallback(async () => {
    try {
      setLoading(true)
      setErrorClases('')
      
      // Para vista de día, usar directamente la fecha seleccionada
      // Para vista de semana, usar el inicio de la semana
      let fechaInicio: Date
      let fechaFin: Date
      
      if (vista === 'dia') {
        // Para el día, usar la fecha seleccionada normalizada a inicio del día (00:00:00)
        fechaInicio = new Date(fechaSeleccionada)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin = new Date(fechaSeleccionada)
        fechaFin.setHours(23, 59, 59, 999)
      } else {
        // Para la semana, usar el inicio de la semana
        fechaInicio = startOfWeek(fechaSeleccionada, { weekStartsOn: 1 })
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin = addDays(fechaInicio, 6)
        fechaFin.setHours(23, 59, 59, 999)
      }
      
      const response = await fetch(
        `/api/clases?inicio=${fechaInicio.toISOString()}&fin=${fechaFin.toISOString()}`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403) {
          setErrorClases(errorData.error || 'Debe tener una escuela asignada para ver clases')
          setClases([])
        } else {
          setErrorClases('Error al cargar clases')
        }
        return
      }
      
      const data = await response.json()
      setClases(data)
    } catch (error) {
      console.error('Error al cargar clases:', error)
      setErrorClases('Error al cargar clases')
    } finally {
      setLoading(false)
    }
  }, [vista, fechaSeleccionada])

  useEffect(() => {
    cargarClases()
    cargarProfesores()
  }, [cargarClases])

  useEffect(() => {
    if ((user.role === 'ESTUDIANTE' || user.role === 'PROFESOR') && session?.user?.escuelaId) {
      cargarNombreEscuela()
    }
  }, [session?.user?.escuelaId, user.role])

  useEffect(() => {
    aplicarFiltros()
  }, [clases, filtroProfesor, filtroNivel, filtroEstilo, filtroLugar])

  const cargarProfesores = async () => {
    try {
      const response = await fetch('/api/profesores')
      const data = await response.json()
      setProfesores(data)
    } catch (error) {
      console.error('Error al cargar profesores:', error)
    }
  }

  const cargarNombreEscuela = async () => {
    try {
      if (!session?.user?.escuelaId) return
      const response = await fetch(`/api/escuelas/${session.user.escuelaId}`)
      if (response.ok) {
        const escuela = await response.json()
        setNombreEscuela(escuela.nombre)
      }
    } catch (error) {
      console.error('Error al cargar nombre de escuela:', error)
    }
  }

  // Obtener profesores únicos de las clases visibles (ya filtradas por escuela)
  const profesoresDeClases = Array.from(
    new Map(
      clases.map((c: ClaseConProfesor) => [c.profesorId, { id: c.profesorId, name: c.profesor.name }])
    ).values()
  )

  const aplicarFiltros = () => {
    let filtradas = [...clases]

    if (filtroProfesor !== 'todos') {
      filtradas = filtradas.filter(c => c.profesorId === filtroProfesor)
    }

    if (filtroNivel !== 'todos') {
      filtradas = filtradas.filter(c => c.nivel === filtroNivel)
    }

    if (filtroEstilo !== 'todos') {
      filtradas = filtradas.filter(c => c.estilo === filtroEstilo)
    }

    if (filtroLugar !== 'todos') {
      filtradas = filtradas.filter(c => c.lugar === filtroLugar)
    }

    setClasesFiltradas(filtradas)
  }

  // Filtrar lugares solo de las clases visibles (ya filtradas por escuela)
  const lugares = Array.from(new Set(clases.map(c => c.lugar)))
  
  // Filtrar estilos únicos de las clases visibles (ya filtradas por escuela)
  const estilos = Array.from(new Set(clases.map(c => c.estilo))).sort()
  
  // Filtrar profesores solo de las clases visibles (ya filtradas por escuela)
  const profesoresVisibles = Array.from(
    new Set(clases.map(c => ({ id: c.profesorId, name: c.profesor.name })))
  ).map(p => ({ id: p.id, name: p.name }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Almanaque de Clases</h1>
              <p className="text-sm text-gray-500">
                {session?.user?.name || session?.user?.email}
                {session?.user?.role && ` • ${session.user.role}`}
                {(user.role === 'ESTUDIANTE' || user.role === 'PROFESOR') && nombreEscuela && (
                  <span className="ml-2 text-primary-600 font-medium">• {nombreEscuela}</span>
                )}
              </p>
            </div>
            
            {/* Desktop: Botones visibles */}
            <div className="hidden md:flex items-center gap-4">
              {(user.role === 'ADMIN' || (user.role === 'PROFESOR' && (user as any).esAdminEscuela)) && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Panel Admin
                </button>
              )}
              {user.role === 'PROFESOR' && (
                <button
                  onClick={() => router.push('/profesor')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Dashboard
                </button>
              )}
              {(user.role === 'ADMIN' || user.role === 'PROFESOR') && (
                <button
                  onClick={() => router.push('/clases/nueva')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                >
                  + Nueva Clase
                </button>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cerrar Sesión
              </button>
            </div>

            {/* Mobile: Menú de elipsis */}
            <div className="md:hidden relative">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="p-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                aria-label="Menú de opciones"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Menú desplegable */}
              {menuAbierto && (
                <>
                  {/* Overlay para cerrar al hacer clic fuera */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuAbierto(false)}
                  />
                  {/* Menú */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      {(user.role === 'ADMIN' || (user.role === 'PROFESOR' && (user as any).esAdminEscuela)) && (
                        <button
                          onClick={() => {
                            router.push('/admin')
                            setMenuAbierto(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Panel Admin
                        </button>
                      )}
                      {user.role === 'PROFESOR' && (
                        <button
                          onClick={() => {
                            router.push('/profesor')
                            setMenuAbierto(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Dashboard
                        </button>
                      )}
                      {(user.role === 'ADMIN' || user.role === 'PROFESOR') && (
                        <button
                          onClick={() => {
                            router.push('/clases/nueva')
                            setMenuAbierto(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          + Nueva Clase
                        </button>
                      )}
                      <div className="border-t border-gray-200 my-1" />
                      <button
                        onClick={() => {
                          signOut({ callbackUrl: '/login' })
                          setMenuAbierto(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controles de Navegación */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const nuevaFecha = addDays(fechaSeleccionada, vista === 'semana' ? -7 : -1)
                  setFechaSeleccionada(nuevaFecha)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setFechaSeleccionada(new Date())}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Hoy
              </button>
              <button
                onClick={() => {
                  const nuevaFecha = addDays(fechaSeleccionada, vista === 'semana' ? 7 : 1)
                  setFechaSeleccionada(nuevaFecha)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Siguiente →
              </button>
            </div>
            {vista === 'dia' && (
              <button
                onClick={() => setVista('semana')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Ver Semana
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de error si no tiene escuela */}
        {errorClases && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">{errorClases}</p>
            <p className="text-sm mt-1">Contacta al administrador para asignarte una escuela.</p>
          </div>
        )}

        {/* Filtros */}
        {!errorClases && (
          <Filtros
            profesores={profesoresDeClases as Profesor[]}
            filtroProfesor={filtroProfesor}
            filtroNivel={filtroNivel}
            filtroEstilo={filtroEstilo}
            filtroLugar={filtroLugar}
            lugares={lugares}
            estilos={estilos}
            onProfesorChange={setFiltroProfesor}
            onNivelChange={setFiltroNivel}
            onEstiloChange={setFiltroEstilo}
            onLugarChange={setFiltroLugar}
          />
        )}

        {/* Calendario */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-500">Cargando clases...</p>
          </div>
        ) : (
          <VistaCalendario
            vista={vista}
            fechaSeleccionada={fechaSeleccionada}
            clases={clasesFiltradas}
            usuarioId={user.id}
            usuarioRole={user.role}
            esAdminEscuela={user.esAdminEscuela}
            onClaseActualizada={cargarClases}
            onCambiarVista={(nuevaVista, nuevaFecha) => {
              setVista(nuevaVista)
              if (nuevaFecha) {
                setFechaSeleccionada(nuevaFecha)
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

