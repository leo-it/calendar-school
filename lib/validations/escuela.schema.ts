import { z } from 'zod'
import { sanitizeForDatabase } from '@/lib/security'

// Helper para sanitizar strings en Zod
const sanitizeString = (str: string | null | undefined): string | null => {
  if (!str) return null
  return sanitizeForDatabase(str) || null
}

export const updateEscuelaSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre es demasiado largo')
    .transform(sanitizeString)
    .optional(),
  direccion: z.string()
    .max(500, 'La dirección es demasiado larga')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  telefono: z.string()
    .max(20, 'El teléfono es demasiado largo')
    .regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email demasiado largo')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  instagram: z.string()
    .max(100, 'El usuario de Instagram es demasiado largo')
    .regex(/^[a-zA-Z0-9._]*$/, 'Usuario de Instagram inválido')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  facebook: z.string()
    .max(200, 'La URL de Facebook es demasiado larga')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  whatsapp: z.string()
    .max(20, 'El número de WhatsApp es demasiado largo')
    .regex(/^[0-9+\-\s()]*$/, 'Formato de WhatsApp inválido')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  web: z.string()
    .url('URL inválida')
    .max(500, 'La URL es demasiado larga')
    .transform(sanitizeString)
    .optional()
    .nullable(),
  activa: z.boolean().optional(),
})

