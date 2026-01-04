import { NextResponse } from 'next/server'

/**
 * Headers de seguridad para todas las respuestas
 */
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js necesita unsafe-eval en dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Permitir Google Fonts
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com", // Permitir Google Fonts
      "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com", // Permitir Google Fonts
      "frame-ancestors 'none'",
    ].join('; '),
  }
}

/**
 * Aplicar headers de seguridad a una respuesta
 */
export function applySecurityHeaders(response: NextResponse) {
  const headers = getSecurityHeaders()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

/**
 * Sanitizar string para prevenir XSS y SQL Injection
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return ''
  
  return input
    // Prevenir SQL Injection: remover caracteres peligrosos
    .replace(/['";\\]/g, '') // Remover comillas simples, dobles, punto y coma, backslash
    .replace(/--/g, '') // Remover comentarios SQL
    .replace(/\/\*/g, '') // Remover comentarios SQL multilínea inicio
    .replace(/\*\//g, '') // Remover comentarios SQL multilínea fin
    .replace(/xp_/gi, '') // Remover procedimientos almacenados peligrosos
    .replace(/sp_/gi, '') // Remover procedimientos almacenados peligrosos
    .replace(/exec/gi, '') // Remover comandos exec
    .replace(/execute/gi, '') // Remover comandos execute
    .replace(/union/gi, '') // Remover UNION SQL
    .replace(/select/gi, '') // Remover SELECT SQL
    .replace(/insert/gi, '') // Remover INSERT SQL
    .replace(/update/gi, '') // Remover UPDATE SQL
    .replace(/delete/gi, '') // Remover DELETE SQL
    .replace(/drop/gi, '') // Remover DROP SQL
    .replace(/create/gi, '') // Remover CREATE SQL
    .replace(/alter/gi, '') // Remover ALTER SQL
    .replace(/script/gi, '') // Remover tags script
    // Prevenir XSS
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript: protocol
    .replace(/on\w+=/gi, '') // Remover event handlers (onclick, onerror, etc.)
    .trim()
    .slice(0, 10000) // Limitar longitud
}

/**
 * Sanitizar string para uso en base de datos (más permisivo, solo SQL injection)
 * Para campos que necesitan caracteres especiales pero deben estar seguros contra SQL
 */
export function sanitizeForDatabase(input: string | null | undefined): string {
  if (!input) return ''
  
  return input
    // Solo prevenir SQL Injection, permitir otros caracteres
    .replace(/['";\\]/g, '') // Remover comillas y caracteres peligrosos
    .replace(/--/g, '') // Remover comentarios SQL
    .replace(/\/\*/g, '') // Remover comentarios SQL multilínea inicio
    .replace(/\*\//g, '') // Remover comentarios SQL multilínea fin
    .replace(/xp_/gi, '') // Remover procedimientos almacenados peligrosos
    .replace(/sp_/gi, '') // Remover procedimientos almacenados peligrosos
    .replace(/exec/gi, '') // Remover comandos exec
    .replace(/execute/gi, '') // Remover comandos execute
    .replace(/union/gi, '') // Remover UNION SQL
    .replace(/select/gi, '') // Remover SELECT SQL
    .replace(/insert/gi, '') // Remover INSERT SQL
    .replace(/update/gi, '') // Remover UPDATE SQL
    .replace(/delete/gi, '') // Remover DELETE SQL
    .replace(/drop/gi, '') // Remover DROP SQL
    .replace(/create/gi, '') // Remover CREATE SQL
    .replace(/alter/gi, '') // Remover ALTER SQL
    .trim()
}

/**
 * Sanitizar número para prevenir SQL injection
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null
  
  if (typeof input === 'number') {
    return isNaN(input) ? null : input
  }
  
  const num = parseFloat(String(input))
  return isNaN(num) ? null : num
}

/**
 * Sanitizar ID (CUID o UUID) para prevenir SQL injection
 */
export function sanitizeId(input: string | null | undefined): string | null {
  if (!input) return null
  
  // Solo permitir caracteres alfanuméricos y guiones (para CUID y UUID)
  const sanitized = input.replace(/[^a-zA-Z0-9-]/g, '')
  
  // Validar formato básico (debe tener al menos 10 caracteres para CUID)
  if (sanitized.length < 10 || sanitized.length > 50) {
    return null
  }
  
  return sanitized
}

/**
 * Validar formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Rate limiting simple (para implementar con Redis en producción)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Limpiar entradas expiradas cada minuto
setInterval(() => {
  const now = Date.now()
  Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  })
}, 60000)

