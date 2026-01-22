import { parseISO } from 'date-fns'

export function parseFechaLocal(fecha: Date | string): Date {
  if (typeof fecha === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [año, mes, dia] = fecha.split('-').map(Number)
      return new Date(año, mes - 1, dia, 0, 0, 0, 0)
    }
    return parseISO(fecha)
  }
  return fecha
}

export function fechaToString(fecha: Date | string): string {
  if (typeof fecha === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha
    }
    const fechaObj = parseFechaLocal(fecha)
    const año = fechaObj.getFullYear()
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0')
    const dia = String(fechaObj.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}
