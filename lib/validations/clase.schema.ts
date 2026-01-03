import { z } from 'zod'

// Schema base sin refinements para poder usar .partial()
const baseClaseSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(200, 'El título es demasiado largo'),
  descripcion: z.string().max(1000, 'La descripción es demasiado larga').optional().nullable(),
  diaSemana: z.union([
    z.string().regex(/^[0-6]$/).transform((val) => parseInt(val, 10)),
    z.number().int().min(0).max(6)
  ]),
  horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  nivel: z.enum(['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'], {
    errorMap: () => ({ message: 'Nivel inválido' })
  }),
  estilo: z.string().max(100).optional().nullable(),
  lugar: z.string().min(1, 'El lugar es requerido').max(200, 'El lugar es demasiado largo'),
  capacidad: z.number().int().positive().max(1000).default(20),
  profesorId: z.string().cuid().optional().nullable(),
  profesorNombre: z.string().max(200).optional().nullable(),
  fechaInicio: z.string().datetime().optional().nullable(),
  fechaFin: z.string().datetime().optional().nullable(),
  escuelaId: z.string().cuid().optional().nullable(),
})

export const createClaseSchema = baseClaseSchema
  .refine(data => data.profesorId || data.profesorNombre, {
    message: 'Debe proporcionar profesorId o profesorNombre',
    path: ['profesorId']
  })
  .refine(data => {
    if (data.horaInicio && data.horaFin) {
      const [hInicio, mInicio] = data.horaInicio.split(':').map(Number)
      const [hFin, mFin] = data.horaFin.split(':').map(Number)
      const inicioMinutos = hInicio * 60 + mInicio
      const finMinutos = hFin * 60 + mFin
      return finMinutos > inicioMinutos
    }
    return true
  }, {
    message: 'La hora de fin debe ser posterior a la hora de inicio',
    path: ['horaFin']
  })

export const updateClaseSchema = baseClaseSchema.partial().extend({
  activa: z.boolean().optional(),
})

export const subscribeClaseSchema = z.object({
  claseId: z.string().cuid('ID de clase inválido'),
  fecha: z.string().datetime().optional(),
})
