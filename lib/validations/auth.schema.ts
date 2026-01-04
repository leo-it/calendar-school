import { z } from 'zod'
import { sanitizeForDatabase, sanitizeId } from '@/lib/security'

// Helper para sanitizar strings en Zod
const sanitizeString = (str: string | null | undefined): string | null => {
  if (!str) return null
  return sanitizeForDatabase(str) || null
}

export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email demasiado largo')
    .transform(sanitizeString)
    .refine((val) => val !== null, { message: 'Email inválido' }),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es demasiado largo')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  apellido: z.string()
    .max(100, 'El apellido es demasiado largo')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  dni: z.string()
    .max(20, 'El DNI es demasiado largo')
    .regex(/^[0-9]*$/, 'El DNI solo puede contener números')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  role: z.enum(['ADMIN', 'PROFESOR', 'ESTUDIANTE']).default('ESTUDIANTE'),
  phone: z.string()
    .max(20, 'El teléfono es demasiado largo')
    .regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  escuelaId: z.string()
    .cuid()
    .transform((val) => sanitizeId(val))
    .optional()
    .nullable(),
  codigoInvitacion: z.string()
    .max(50)
    .transform(sanitizeString)
    .optional()
    .nullable(),
  nombreEscuela: z.string()
    .max(200, 'El nombre de la escuela es demasiado largo')
    .transform(sanitizeString)
    .optional()
    .nullable(),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const createEstudianteSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre es demasiado largo')
    .transform(sanitizeString)
    .refine((val) => val !== null, { message: 'El nombre es obligatorio' }),
  apellido: z.string()
    .max(100, 'El apellido es demasiado largo')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  dni: z.string()
    .max(20, 'El DNI es demasiado largo')
    .regex(/^[0-9]*$/, 'El DNI solo puede contener números')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  claseId: z.string()
    .cuid()
    .transform((val) => sanitizeId(val))
    .optional()
    .nullable(),
})

