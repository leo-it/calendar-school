/**
 * Validación de email gratuita
 * 
 * Estrategia:
 * 1. Validación de formato (regex)
 * 2. Validación de dominio MX (DNS lookup - gratis, sin límites)
 * 3. Opcional: API gratuita para verificación avanzada
 */

import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)

/**
 * Validar formato de email
 */
export function validateEmailFormat(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'El email es requerido' }
  }

  if (email.length > 255) {
    return { valid: false, error: 'El email es demasiado largo' }
  }

  // Regex mejorado para validación de formato
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Formato de email inválido' }
  }

  return { valid: true }
}

/**
 * Validar dominio MX (verificar que el dominio acepta emails)
 * Esto es GRATIS y sin límites
 */
export async function validateEmailDomain(email: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const domain = email.split('@')[1]
    
    if (!domain) {
      return { valid: false, error: 'Dominio de email inválido' }
    }

    // Verificar que el dominio tiene registros MX
    const mxRecords = await resolveMx(domain)
    
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, error: 'El dominio no acepta emails (sin registros MX)' }
    }

    return { valid: true }
  } catch (error: any) {
    // Si no hay registros MX, el dominio no acepta emails
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return { valid: false, error: 'El dominio no existe o no acepta emails' }
    }
    
    // Otros errores DNS (puede ser temporal)
    console.warn('Error al validar dominio MX:', error.message)
    // En caso de error DNS, permitimos el email (puede ser problema temporal)
    return { valid: true }
  }
}

/**
 * Validación completa de email (formato + dominio)
 */
export async function validateEmail(email: string): Promise<{ valid: boolean; error?: string }> {
  // 1. Validar formato
  const formatCheck = validateEmailFormat(email)
  if (!formatCheck.valid) {
    return formatCheck
  }

  // 2. Validar dominio MX
  const domainCheck = await validateEmailDomain(email)
  if (!domainCheck.valid) {
    return domainCheck
  }

  return { valid: true }
}

/**
 * Lista de dominios temporales/descartables conocidos
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  // Agregar más según necesidad
]

/**
 * Verificar si es un email desechable
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  
  return DISPOSABLE_EMAIL_DOMAINS.some(d => domain.includes(d))
}

