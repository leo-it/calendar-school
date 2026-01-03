import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSecurityHeaders } from './lib/security'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Aplicar headers de seguridad
  const securityHeaders = getSecurityHeaders()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Headers adicionales para API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

