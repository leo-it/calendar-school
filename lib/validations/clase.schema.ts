import { z } from 'zod'
import { sanitizeForDatabase, sanitizeId, sanitizeNumber } from '@/lib/security'

// Helper para sanitizar strings en Zod
const sanitizeString = (str: string | null | undefined): string | null => {
  if (!str) return null
  return sanitizeForDatabase(str) || null
}

// Schema base sin refinements para poder usar .partial()
const baseClaseSchema = z.object({
  titulo: z.string()
    .min(1, 'El título es requerido')
    .max(200, 'El título es demasiado largo')
    .transform(sanitizeString)
    .refine((val) => val !== null, { message: 'El título es requerido' }),
  descripcion: z.string()
    .max(1000, 'La descripción es demasiado larga')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  diaSemana: z.union([
    z.string().regex(/^[0-6]$/).transform((val) => {
      const num = parseInt(val, 10)
      return isNaN(num) ? 0 : Math.max(0, Math.min(6, num))
    }),
    z.number().int().min(0).max(6).transform((val) => Math.max(0, Math.min(6, val)))
  ]),
  horaInicio: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
    .transform((val) => sanitizeString(val) || val),
  horaFin: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
    .transform((val) => sanitizeString(val) || val),
  nivel: z.enum(['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'], {
    errorMap: () => ({ message: 'Nivel inválido' })
  }),
  estilo: z.string()
    .max(100)
    .transform(sanitizeString)
    .optional()
    .nullable(),
  lugar: z.string()
    .max(200, 'El lugar es demasiado largo')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  capacidad: z.union([
    z.string().transform((val) => sanitizeNumber(val) ?? 20),
    z.number().transform((val) => sanitizeNumber(val) ?? 20)
  ]).refine((val) => val !== null && val !== undefined && val > 0 && val <= 1000, {
    message: 'La capacidad debe ser un número entre 1 y 1000'
  }).default(20),
  profesorId: z.string()
    .cuid()
    .transform((val) => sanitizeId(val))
    .optional()
    .nullable(),
  profesorNombre: z.string()
    .max(200)
    .transform(sanitizeString)
    .optional()
    .nullable(),
  fechaInicio: z.string()
    .datetime()
    .transform((val) => sanitizeString(val))
    .optional()
    .nullable(),
  fechaFin: z.string()
    .datetime()
    .transform((val) => sanitizeString(val))
    .optional()
    .nullable(),
  escuelaId: z.string()
    .cuid()
    .transform((val) => sanitizeId(val))
    .optional()
    .nullable(),
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
