'use client'

import { format, startOfWeek, addDays, parseISO, isSameDay, isSameWeek } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Clase, Profesor } from '@prisma/client'
import TarjetaClase from './TarjetaClase'

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
  if (vista === 'dia') {
    return <VistaDia fecha={fechaSeleccionada} clases={clases} usuarioId={usuarioId} usuarioRole={usuarioRole} esAdminEscuela={esAdminEscuela} onClaseActualizada={onClaseActualizada} onCambiarVista={onCambiarVista} />
  }

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
    const fechaClase = parseISO(clase.fecha.toString())
    return isSameDay(fechaClase, fecha)
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
  const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 })
  const finSemana = addDays(inicioSemana, 6)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i))

  // Determinar si todos los días están en el mismo mes
  const mismoMes = dias.every(dia => format(dia, 'MMM yyyy', { locale: es }) === format(inicioSemana, 'MMM yyyy', { locale: es }))

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Título con rango de fechas - Oculto en mobile */}
      <div className="hidden md:block bg-gray-50 border-b px-6 py-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {mismoMes ? (
            `${format(inicioSemana, 'd', { locale: es })} - ${format(finSemana, "d 'de' MMMM 'de' yyyy", { locale: es })}`
          ) : (
            `${format(inicioSemana, "d 'de' MMMM", { locale: es })} - ${format(finSemana, "d 'de' MMMM 'de' yyyy", { locale: es })}`
          )}
        </h2>
      </div>
      
      {/* Vista Desktop: Grid horizontal */}
      <div className="hidden md:grid md:grid-cols-7 border-b">
        {dias.map((dia) => (
          <div
            key={dia.toISOString()}
            onClick={() => onCambiarVista?.('dia', dia)}
            className={`p-4 text-center border-r last:border-r-0 cursor-pointer hover:bg-gray-400 transition-colors ${
              isSameDay(dia, new Date())
                ? 'bg-primary-50 font-semibold'
                : 'bg-gray-50'
            }`}
          >
            <div className="text-sm text-gray-600">
              {format(dia, 'EEE', { locale: es })}
            </div>
            <div className="text-lg mt-1 font-semibold">
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
      
      {/* Vista Desktop: Contenido de clases */}
      <div className="hidden md:grid md:grid-cols-7 min-h-[400px]">
        {dias.map((dia) => {
          const clasesDelDia = clases.filter((clase) => {
            if (!clase.fecha) return false
            const fechaClase = parseISO(clase.fecha.toString())
            return isSameDay(fechaClase, dia)
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

      {/* Vista Mobile: Grid vertical tipo planner */}
      <div className="md:hidden">
        {dias.map((dia) => {
          const clasesDelDia = clases.filter((clase) => {
            if (!clase.fecha) return false
            const fechaClase = parseISO(clase.fecha.toString())
            return isSameDay(fechaClase, dia)
          })

          const esHoy = isSameDay(dia, new Date())

          return (
            <div
              key={dia.toISOString()}
              className="border-b last:border-b-0"
            >
              {/* Header del día - estilo planner */}
              <div
                onClick={() => onCambiarVista?.('dia', dia)}
                className={`px-4 py-3 rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity ${
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
  )
}

