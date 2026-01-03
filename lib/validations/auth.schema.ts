import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email demasiado largo'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo').optional().nullable(),
  apellido: z.string().max(100, 'El apellido es demasiado largo').optional().nullable(),
  dni: z.string().max(20, 'El DNI es demasiado largo').regex(/^[0-9]*$/, 'El DNI solo puede contener números').optional().nullable(),
  role: z.enum(['ADMIN', 'PROFESOR', 'ESTUDIANTE']).default('ESTUDIANTE'),
  phone: z.string().max(20, 'El teléfono es demasiado largo').regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido').optional().nullable(),
  escuelaId: z.string().cuid().optional().nullable(),
  codigoInvitacion: z.string().max(50).optional().nullable(),
  nombreEscuela: z.string().max(200, 'El nombre de la escuela es demasiado largo').optional().nullable(),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const createEstudianteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo'),
  apellido: z.string().max(100, 'El apellido es demasiado largo').optional().nullable(),
  dni: z.string().max(20, 'El DNI es demasiado largo').regex(/^[0-9]*$/, 'El DNI solo puede contener números').optional().nullable(),
  claseId: z.string().cuid().optional().nullable(),
})

