/**
 * Genera una URL de Google Calendar para agregar un evento
 */
export function generarUrlGoogleCalendar(clase: {
  titulo: string
  descripcion?: string | null
  horaInicio: string
  horaFin: string
  lugar: string
  profesor: { name: string }
  nivel: string
  estilo: string
  diaSemana: number
  fecha?: Date | string
}) {
  // Calcular la fecha del evento
  let fechaEvento: Date
  
  if (clase.fecha) {
    fechaEvento = new Date(clase.fecha)
  } else {
    // Si no hay fecha específica, calcular el próximo día de la semana
    const hoy = new Date()
    const diaActual = hoy.getDay() // 0 = Domingo, 1 = Lunes, etc.
    
    // Calcular días hasta el próximo día de la semana
    let diasHastaProximo = (clase.diaSemana - diaActual + 7) % 7
    
    // Si es hoy y ya pasó la hora, usar la próxima semana
    if (diasHastaProximo === 0) {
      const [hora, minuto] = clase.horaInicio.split(':').map(Number)
      const horaEvento = new Date(hoy)
      horaEvento.setHours(hora, minuto, 0, 0)
      
      if (horaEvento <= hoy) {
        diasHastaProximo = 7
      }
    }
    
    fechaEvento = new Date(hoy)
    fechaEvento.setDate(fechaEvento.getDate() + diasHastaProximo)
  }

  // Parsear horas
  const [horaInicio, minutoInicio] = clase.horaInicio.split(':').map(Number)
  const [horaFin, minutoFin] = clase.horaFin.split(':').map(Number)

  // Crear fechas de inicio y fin
  const inicio = new Date(fechaEvento)
  inicio.setHours(horaInicio, minutoInicio, 0, 0)
  
  const fin = new Date(fechaEvento)
  fin.setHours(horaFin, minutoFin, 0, 0)

  // Formatear fechas en formato Google Calendar (YYYYMMDDTHHMMSS)
  const formatearFecha = (fecha: Date) => {
    const year = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const day = String(fecha.getDate()).padStart(2, '0')
    const hours = String(fecha.getHours()).padStart(2, '0')
    const minutes = String(fecha.getMinutes()).padStart(2, '0')
    const seconds = String(fecha.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}`
  }

  const fechaInicioStr = formatearFecha(inicio)
  const fechaFinStr = formatearFecha(fin)

  // Construir descripción
  const descripcion = clase.descripcion || ''
  const detalles = [
    descripcion,
    `Profesor: ${clase.profesor.name}`,
    `Nivel: ${clase.nivel}`,
    `Estilo: ${clase.estilo}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  // Construir URL
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: clase.titulo,
    dates: `${fechaInicioStr}/${fechaFinStr}`,
    details: detalles,
    location: clase.lugar,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

