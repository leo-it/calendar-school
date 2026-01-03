'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale/es'
import Filtros from '@/components/Filtros'
import VistaCalendario from '@/components/VistaCalendario'
import { Clase, Profesor } from '@prisma/client'
import { Nivel } from '@/types/enums'

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
  const [infoEscuela, setInfoEscuela] = useState<any>(null)

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
        setInfoEscuela(escuela)
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

        {/* Footer con Información de Contacto */}
        {infoEscuela && (infoEscuela.direccion || infoEscuela.telefono || infoEscuela.email || 
                        infoEscuela.whatsapp || infoEscuela.instagram || infoEscuela.facebook || infoEscuela.web) && (
          <footer className="mt-8 bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Información de Contacto</h3>
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
                {infoEscuela.direccion && (
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(infoEscuela.direccion)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{infoEscuela.direccion}</span>
                  </a>
                )}
                {infoEscuela.telefono && (
                  <a 
                    href={`tel:${infoEscuela.telefono.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{infoEscuela.telefono}</span>
                  </a>
                )}
                {infoEscuela.email && (
                  <a 
                    href={`mailto:${infoEscuela.email}`}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{infoEscuela.email}</span>
                  </a>
                )}
                {infoEscuela.whatsapp && (
                  <a 
                    href={`https://wa.me/${infoEscuela.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>{infoEscuela.whatsapp}</span>
                  </a>
                )}
                {infoEscuela.instagram && (
                  <a 
                    href={`https://instagram.com/${infoEscuela.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span>{infoEscuela.instagram}</span>
                  </a>
                )}
                {infoEscuela.facebook && (
                  <a 
                    href={`https://facebook.com${infoEscuela.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>{infoEscuela.facebook}</span>
                  </a>
                )}
                {infoEscuela.web && (
                  <a 
                    href={infoEscuela.web.startsWith('http') ? infoEscuela.web : `https://${infoEscuela.web}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>{infoEscuela.web}</span>
                  </a>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

