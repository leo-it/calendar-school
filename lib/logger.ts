/**
 * Sistema de Logging Estructurado para Kibana/ELK Stack
 * 
 * Los logs se generan en formato JSON para facilitar el parsing en Kibana.
 * Cada log incluye metadatos estructurados para filtrado y análisis.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  context?: LogContext
  userId?: string
  requestId?: string
  duration?: number
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private serviceName: string
  private isDevelopment: boolean

  constructor(serviceName: string = 'almanaque') {
    this.serviceName = serviceName
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Formatea el log como JSON para Kibana
   */
  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      ...(context && { context }),
    }

    // En desarrollo, mostrar logs formateados para legibilidad
    if (this.isDevelopment) {
      return JSON.stringify(logEntry, null, 2)
    }

    // En producción, JSON compacto para Kibana
    return JSON.stringify(logEntry)
  }

  /**
   * Log de nivel DEBUG - Información detallada para debugging
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'debug' || this.isDevelopment) {
      console.log(this.formatLog('debug', message, context))
    }
  }

  /**
   * Log de nivel INFO - Eventos normales de la aplicación
   */
  info(message: string, context?: LogContext): void {
    console.log(this.formatLog('info', message, context))
  }

  /**
   * Log de nivel WARN - Advertencias que no detienen la ejecución
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog('warn', message, context))
  }

  /**
   * Log de nivel ERROR - Errores que requieren atención
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : {
            message: String(error),
          },
    }

    console.error(this.formatLog('error', message, errorContext))
  }

  /**
   * Log de operaciones de API con contexto de request
   */
  api(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    context?: LogContext
  ): void {
    this.info(`${method} ${path} - ${statusCode}`, {
      ...context,
      type: 'api_request',
      method,
      path,
      statusCode,
      duration,
    })
  }

  /**
   * Log de autenticación
   */
  auth(action: string, userId?: string, context?: LogContext): void {
    this.info(`Auth: ${action}`, {
      ...context,
      type: 'authentication',
      action,
      userId,
    })
  }

  /**
   * Log de operaciones de base de datos
   */
  db(operation: string, model: string, duration?: number, context?: LogContext): void {
    this.debug(`DB: ${operation} on ${model}`, {
      ...context,
      type: 'database',
      operation,
      model,
      duration,
    })
  }

  /**
   * Log de operaciones de negocio (inscripciones, clases, etc.)
   */
  business(
    action: string,
    entity: string,
    entityId?: string,
    userId?: string,
    context?: LogContext
  ): void {
    this.info(`Business: ${action} ${entity}`, {
      ...context,
      type: 'business',
      action,
      entity,
      entityId,
      userId,
    })
  }

  /**
   * Log de seguridad (intentos maliciosos, rate limiting, etc.)
   */
  security(event: string, severity: 'low' | 'medium' | 'high', context?: LogContext): void {
    const level: LogLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info'
    
    this[level](`Security: ${event}`, {
      ...context,
      type: 'security',
      event,
      severity,
    })
  }
}

// Exportar instancia singleton
export const logger = new Logger('almanaque')

// Exportar clase para crear loggers personalizados si es necesario
export { Logger }

