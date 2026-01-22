'use client'

import { useState } from 'react'
import { format, startOfWeek, addDays, parseISO, isSameDay, isSameWeek } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Clase, Profesor } from '@prisma/client'
import TarjetaClase from './TarjetaClase'
import { parseFechaLocal } from '@/lib/fechas'

type Vista = 'dia' | 'semana'

interface ClaseConProfesor extends Clase {
  profesor: Profesor
  fecha?: Date | string // Fecha específica de la ocurrencia (añadida por la API del calendario)
}

interface VistaCalendarioProps {
  vista: Vista
  fechaSeleccionada: Date
  clases: ClaseConProfesor[]
  usuarioId: string
  usuarioRole?: string
  esAdminEscuela?: boolean
  onClaseActualizada: () => void
  onCambiarVista?: (vista: Vista, fecha?: Date) => void
}

export default function VistaCalendario({
  vista,
  fechaSeleccionada,
  clases,
  usuarioId,
  usuarioRole,
  esAdminEscuela,
  onClaseActualizada,
  onCambiarVista,
}: VistaCalendarioProps) {
  // Comentado temporalmente - Vista Día deshabilitada
  // if (vista === 'dia') {
  //   return <VistaDia fecha={fechaSeleccionada} clases={clases} usuarioId={usuarioId} usuarioRole={usuarioRole} esAdminEscuela={esAdminEscuela} onClaseActualizada={onClaseActualizada} onCambiarVista={onCambiarVista} />
  // }

  return <VistaSemana fecha={fechaSeleccionada} clases={clases} usuarioId={usuarioId} usuarioRole={usuarioRole} esAdminEscuela={esAdminEscuela} onClaseActualizada={onClaseActualizada} onCambiarVista={onCambiarVista} />
}

function VistaDia({
  fecha,
  clases,
  usuarioId,
  usuarioRole,
  esAdminEscuela,
  onClaseActualizada,
  onCambiarVista,
}: {
  fecha: Date
  clases: ClaseConProfesor[]
  usuarioId: string
  usuarioRole?: string
  esAdminEscuela?: boolean
  onClaseActualizada: () => void
  onCambiarVista?: (vista: Vista, fecha?: Date) => void
}) {
  const clasesDelDia = clases.filter((clase) => {
    if (!clase.fecha) return false
    // Normalizar ambas fechas a medianoche en hora local para comparar correctamente
    const fechaClase = parseFechaLocal(clase.fecha)
    fechaClase.setHours(0, 0, 0, 0)
    const fechaNormalizada = new Date(fecha)
    fechaNormalizada.setHours(0, 0, 0, 0)
    return fechaClase.getTime() === fechaNormalizada.getTime()
  })

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        {format(fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
      </h2>
      {clasesDelDia.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay clases programadas para este día</p>
      ) : (
        <div className="space-y-4">
          {clasesDelDia
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
            .map((clase) => (
              <TarjetaClase
                key={clase.id}
                clase={clase}
                usuarioId={usuarioId}
                usuarioRole={usuarioRole}
                esAdminEscuela={esAdminEscuela}
                onActualizada={onClaseActualizada}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function VistaSemana({
  fecha,
  clases,
  usuarioId,
  usuarioRole,
  esAdminEscuela,
  onClaseActualizada,
  onCambiarVista,
}: {
  fecha: Date
  clases: ClaseConProfesor[]
  usuarioId: string
  usuarioRole?: string
  esAdminEscuela?: boolean
  onClaseActualizada: () => void
  onCambiarVista?: (vista: Vista, fecha?: Date) => void
}) {
  const [vistaLandscape, setVistaLandscape] = useState(false)

  // Normalizar la fecha a medianoche en hora local primero
  const fechaLocal = new Date(fecha)
  fechaLocal.setHours(0, 0, 0, 0)
  
  // Calcular el inicio de semana en hora local
  // getDay() devuelve 0=Domingo, 1=Lunes, etc.
  // Si weekStartsOn: 1 (lunes), necesitamos retroceder (diaSemana - 1) días
  const diaSemanaLocal = fechaLocal.getDay()
  const diasDesdeLunes = diaSemanaLocal === 0 ? 6 : diaSemanaLocal - 1 // Si es domingo (0), retroceder 6 días
  const inicioSemana = new Date(fechaLocal)
  inicioSemana.setDate(inicioSemana.getDate() - diasDesdeLunes)
  
  const finSemana = new Date(inicioSemana)
  finSemana.setDate(finSemana.getDate() + 6)
  
  const dias = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana)
    dia.setDate(dia.getDate() + i)
    return dia
  })

  // Determinar si todos los días están en el mismo mes
  const mismoMes = dias.every(dia => format(dia, 'MMM yyyy', { locale: es }) === format(inicioSemana, 'MMM yyyy', { locale: es }))

  return (
    <>
      {/* Botón toggle vista landscape - Solo visible en mobile, siempre accesible */}
      <button
        onClick={() => setVistaLandscape(!vistaLandscape)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all duration-200 active:scale-95"
        aria-label={vistaLandscape ? 'Vista vertical' : 'Vista horizontal'}
        style={vistaLandscape ? {
          transform: 'rotate(-90deg)',
          bottom: '50%',
          right: '6px',
          marginBottom: '-20px'
        } : {}}
      >
        <svg 
          className={`w-6 h-6 transition-transform duration-300 ${vistaLandscape ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
      </button>

      <div 
        className={`bg-white rounded-lg shadow-sm overflow-hidden relative md:transform-none transition-all duration-500 ${vistaLandscape ? 'md:hidden' : ''}`}
        style={vistaLandscape ? { 
          transform: 'rotate(90deg)',
          width: '100vh',
          height: '100vw',
          position: 'fixed',
          top: '50%',
          left: '50%',
          marginTop: `calc(-50vw + 80px)`,
          marginLeft: '-50vh',
          zIndex: 40,
          maxHeight: '100vw',
          maxWidth: '100vh'
        } : {}}
      >

      {/* Título con rango de fechas - Visible en desktop o cuando está en vista landscape */}
      <div className={`${vistaLandscape ? 'block' : 'hidden'} md:block bg-gray-50 border-b px-6 py-3`}>
        <h2 className="text-lg font-semibold text-gray-800">
          {mismoMes ? (
            `${format(inicioSemana, 'd', { locale: es })} - ${format(finSemana, "d 'de' MMMM 'de' yyyy", { locale: es })}`
          ) : (
            `${format(inicioSemana, "d 'de' MMMM", { locale: es })} - ${format(finSemana, "d 'de' MMMM 'de' yyyy", { locale: es })}`
          )}
        </h2>
      </div>
      
      {/* Vista Desktop: Grid horizontal - Visible en desktop o cuando está en vista landscape */}
      <div className={`${vistaLandscape ? 'grid' : 'hidden'} md:grid grid-cols-7 border-b`}>
        {dias.map((dia) => (
          <div
            key={dia.toISOString()}
            // onClick={() => onCambiarVista?.('dia', dia)} // Comentado - Vista Día deshabilitada
            className={`p-4 text-center border-r last:border-r-0 ${/* cursor-pointer hover:bg-gray-400 transition-colors */ ''} ${
              isSameDay(dia, new Date())
                ? 'bg-primary-50 font-semibold'
                : 'bg-gray-50'
            }`}
          >
            <div className="text-sm text-gray-600">
              {format(dia, 'EEE', { locale: es })}
            </div>
            <div className="text-lg mt-1 font-semibold text-gray-400">
              {format(dia, 'd')}
            </div>
            {!mismoMes && (
              <div className="text-xs text-gray-500 mt-1">
                {format(dia, 'MMM', { locale: es })}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Vista Desktop: Contenido de clases - Visible en desktop o cuando está en vista landscape */}
      <div className={`${vistaLandscape ? 'grid' : 'hidden'} md:grid grid-cols-7 min-h-[400px]`}>
        {dias.map((dia) => {
          const clasesDelDia = clases.filter((clase) => {
            if (!clase.fecha) return false
            // Normalizar ambas fechas a medianoche en hora local para comparar correctamente
            const fechaClase = parseFechaLocal(clase.fecha)
            fechaClase.setHours(0, 0, 0, 0)
            const diaNormalizado = new Date(dia)
            diaNormalizado.setHours(0, 0, 0, 0)
            return fechaClase.getTime() === diaNormalizado.getTime()
          })

          return (
            <div
              key={dia.toISOString()}
              className="border-r last:border-r-0 p-2 min-h-[400px]"
            >
              <div className="space-y-2">
                {clasesDelDia
                  .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                  .map((clase) => (
                    <TarjetaClase
                      key={clase.id}
                      clase={clase}
                      usuarioId={usuarioId}
                      usuarioRole={usuarioRole}
                      esAdminEscuela={esAdminEscuela}
                      onActualizada={onClaseActualizada}
                      compacta
                    />
                  ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Vista Mobile: Grid vertical tipo planner - Oculto cuando está en vista landscape */}
      <div className={`${vistaLandscape ? 'hidden' : 'block'} md:hidden`}>
        {dias.map((dia) => {
          const clasesDelDia = clases.filter((clase) => {
            if (!clase.fecha) return false
            // Normalizar ambas fechas a medianoche en hora local para comparar correctamente
            const fechaClase = parseFechaLocal(clase.fecha)
            fechaClase.setHours(0, 0, 0, 0)
            const diaNormalizado = new Date(dia)
            diaNormalizado.setHours(0, 0, 0, 0)
            return fechaClase.getTime() === diaNormalizado.getTime()
          })

          const esHoy = isSameDay(dia, new Date())

          return (
            <div
              key={dia.toISOString()}
              className="border-b last:border-b-0"
            >
              {/* Header del día - estilo planner */}
              <div
                // onClick={() => onCambiarVista?.('dia', dia)} // Comentado - Vista Día deshabilitada
                className={`px-4 py-3 rounded-t-lg ${/* cursor-pointer hover:opacity-90 transition-opacity */ ''} ${
                  esHoy ? 'bg-primary-600 text-white' : 'bg-gray-700 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">
                      {format(dia, 'EEEE', { locale: es })}
                    </span>
                    <span className="text-sm opacity-90">
                      {format(dia, 'd MMM', { locale: es })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Área de contenido con líneas - estilo papel */}
              <div className="bg-white relative min-h-[120px]">
                {/* Líneas de fondo tipo papel */}
                <div 
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      transparent,
                      transparent 31px,
                      #e5e7eb 31px,
                      #e5e7eb 32px
                    )`,
                    backgroundPosition: '0 0',
                    paddingTop: '8px'
                  }}
                />
                
                {/* Contenido de clases */}
                <div className="relative p-3 space-y-2">
                  {clasesDelDia.length === 0 ? (
                    <div className="text-gray-400 text-xs py-2">
                      {/* Líneas vacías para mantener el estilo */}
                    </div>
                  ) : (
                    clasesDelDia
                      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                      .map((clase) => (
                        <TarjetaClase
                          key={clase.id}
                          clase={clase}
                          usuarioId={usuarioId}
                          usuarioRole={usuarioRole}
                          onActualizada={onClaseActualizada}
                          compacta
                        />
                      ))
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}

