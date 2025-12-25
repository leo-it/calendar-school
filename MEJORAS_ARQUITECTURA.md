# 🏗️ Mejoras de Arquitectura y Diseño - Almanaque

## 📋 Resumen Ejecutivo

Este documento detalla las mejoras recomendadas para el proyecto Almanaque, organizadas por prioridad y categoría.

---

## 🔴 PRIORIDAD ALTA - Arquitectura y Organización

### 1. **Separar Lógica de Negocio de las Rutas API**

**Problema Actual:**
- Las rutas API (`app/api/**/route.ts`) contienen toda la lógica de negocio
- Difícil de testear y reutilizar
- Violación del principio de responsabilidad única

**Solución Recomendada:**
Crear una capa de servicios (`lib/services/`):

```
lib/
├── services/
│   ├── ClaseService.ts      # Lógica de creación, actualización, obtención de clases
│   ├── AuthService.ts      # Lógica de autenticación y autorización
│   ├── EscuelaService.ts   # Lógica de gestión de escuelas
│   ├── ProfesorService.ts  # Lógica de gestión de profesores
│   └── NotificacionService.ts # Lógica de notificaciones
```

**Ejemplo de refactorización:**
```typescript
// lib/services/ClaseService.ts
export class ClaseService {
  static async crearClase(data: CreateClaseDto, userId: string) {
    // Toda la lógica de validación y creación
  }
  
  static async obtenerClases(filtros: FiltrosClase, userId: string) {
    // Lógica de obtención y generación de ocurrencias
  }
}

// app/api/clases/route.ts (simplificado)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  
  const body = await request.json()
  const clase = await ClaseService.crearClase(body, session.user.id)
  return NextResponse.json(clase, { status: 201 })
}
```

**Beneficios:**
- ✅ Código más testeable
- ✅ Reutilizable en diferentes contextos
- ✅ Rutas API más limpias y enfocadas
- ✅ Más fácil de mantener

---

### 2. **Implementar Validación con Zod de Forma Consistente**

**Problema Actual:**
- Validación manual e inconsistente en cada ruta
- No hay esquemas reutilizables
- Errores de validación poco descriptivos

**Solución Recomendada:**
Crear esquemas de validación centralizados:

```
lib/
├── validations/
│   ├── clase.schema.ts
│   ├── auth.schema.ts
│   ├── escuela.schema.ts
│   └── index.ts
```

**Ejemplo:**
```typescript
// lib/validations/clase.schema.ts
import { z } from 'zod'

export const createClaseSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().optional(),
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  nivel: z.enum(['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO']),
  estilo: z.enum(['CONTEMPORANEO', 'JAZZ', 'BALLET', 'HIP_HOP', 'URBANO', 'OTRO']),
  capacidad: z.number().int().positive().default(20),
  profesorId: z.string().optional(),
  profesorNombre: z.string().optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
}).refine(data => data.profesorId || data.profesorNombre, {
  message: 'Debe proporcionar profesorId o profesorNombre'
})

// Uso en ruta API
export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = createClaseSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: result.error.errors },
      { status: 400 }
    )
  }
  
  // Usar result.data (ya validado y tipado)
}
```

---

### 3. **Centralizar Manejo de Errores**

**Problema Actual:**
- Manejo de errores repetitivo en cada ruta
- Mensajes de error inconsistentes
- No hay logging estructurado

**Solución Recomendada:**
Crear un middleware de errores y utilidades:

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

// lib/utils/api-response.ts
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  
  console.error('Error inesperado:', error)
  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  )
}
```

---

### 4. **Implementar Logging Estructurado**

**Problema Actual:**
- Uso de `console.log` y `console.error` disperso (22+ ocurrencias)
- No hay contexto estructurado
- Difícil de filtrar y analizar en producción

**Solución Recomendada:**
Usar una librería de logging como `pino` o `winston`:

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  })
})

// Uso
logger.info({ userId, action: 'create_clase' }, 'Clase creada')
logger.error({ error, userId }, 'Error al crear clase')
```

---

## 🟡 PRIORIDAD MEDIA - Mejoras de Código

### 5. **Extraer Lógica de Autorización a Middleware/Helpers**

**Problema Actual:**
- Lógica de autorización repetida en cada ruta
- Verificaciones de roles y permisos duplicadas

**Solución Recomendada:**
```typescript
// lib/middleware/auth.ts
export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new UnauthorizedError()
  }
  return session
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
) {
  const session = await requireAuth(request)
  if (!allowedRoles.includes(session.user.role)) {
    throw new UnauthorizedError('No tiene permisos suficientes')
  }
  return session
}

// Uso
export async function POST(request: NextRequest) {
  const session = await requireRole(request, ['ADMIN', 'PROFESOR'])
  // ...
}
```

---

### 6. **Optimizar Queries de Prisma**

**Problema Actual:**
- Algunas queries podrían ser más eficientes
- Falta de índices en campos de búsqueda frecuente
- N+1 queries potenciales

**Mejoras:**
```prisma
// prisma/schema.prisma
model Clase {
  // ... campos existentes
  
  @@index([escuelaId, activa])
  @@index([diaSemana, activa])
  @@index([profesorId])
}

model User {
  // ... campos existentes
  
  @@index([escuelaId, role])
}
```

---

### 7. **Crear Tipos Compartidos (DTOs)**

**Problema Actual:**
- Tipos duplicados entre cliente y servidor
- Inconsistencias en la estructura de datos

**Solución Recomendada:**
```
types/
├── api/
│   ├── clases.ts      # Tipos para API de clases
│   ├── auth.ts        # Tipos para API de auth
│   └── index.ts
├── domain/
│   ├── clase.ts       # Tipos de dominio
│   └── user.ts
└── index.ts
```

---

### 8. **Implementar Caché para Queries Frecuentes**

**Problema Actual:**
- Queries repetidas sin caché (ej: lista de profesores, escuelas)

**Solución Recomendada:**
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedProfesores = unstable_cache(
  async () => {
    return prisma.profesor.findMany()
  },
  ['profesores'],
  { revalidate: 3600 } // 1 hora
)
```

---

## 🟢 PRIORIDAD BAJA - Mejoras de Calidad

### 9. **Agregar Tests**

**Estructura recomendada:**
```
__tests__/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   └── api/
└── e2e/
```

**Herramientas:**
- Jest + React Testing Library para componentes
- Vitest para tests unitarios
- Playwright para E2E

---

### 10. **Documentación de API**

**Solución Recomendada:**
- OpenAPI/Swagger con `swagger-jsdoc` o `next-swagger-doc`
- Documentar todos los endpoints, parámetros y respuestas

---

### 11. **Mejorar Estructura de Componentes**

**Problema Actual:**
- Componentes grandes (VistaCalendario.tsx tiene 269 líneas)
- Falta de separación de concerns

**Solución Recomendada:**
```
components/
├── calendario/
│   ├── VistaCalendario.tsx
│   ├── VistaDia.tsx
│   ├── VistaSemana.tsx
│   └── hooks/
│       └── useCalendario.ts
├── clases/
│   ├── TarjetaClase.tsx
│   ├── ModalClase.tsx
│   └── FormularioClase.tsx
└── shared/
    ├── Button.tsx
    ├── Input.tsx
    └── Select.tsx
```

---

### 12. **Implementar Variables de Entorno Tipadas**

**Solución Recomendada:**
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  NEXTAUTH_SECRET: z.string(),
  NEXTAUTH_URL: z.string().url(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  // ...
})

export const env = envSchema.parse(process.env)
```

---

### 13. **Agregar Rate Limiting**

**Solución Recomendada:**
```typescript
// lib/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function rateLimit(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    throw new AppError('Demasiadas solicitudes', 429, 'RATE_LIMIT')
  }
}
```

---

## 📊 Resumen de Mejoras por Impacto

### 🔥 Alto Impacto / Bajo Esfuerzo
1. ✅ Validación con Zod
2. ✅ Centralizar manejo de errores
3. ✅ Logging estructurado
4. ✅ Tipos compartidos (DTOs)
5. ✅ **Metadata SEO básica por página**
6. ✅ **Atributos ARIA esenciales**
7. ✅ **Skip links y landmarks semánticos**

### 🔥 Alto Impacto / Alto Esfuerzo
1. ✅ Separar lógica de negocio (Servicios)
2. ✅ Tests completos
3. ✅ Refactorizar componentes grandes
4. ✅ **Sitemap y robots.txt dinámicos**
5. ✅ **Structured Data (JSON-LD)**
6. ✅ **Reemplazar alert()/confirm() con componentes accesibles**
7. ✅ **Auditoría completa de accesibilidad**
8. ✅ **Migración a arquitectura de microfrontends**

### 📈 Medio Impacto
1. ✅ Middleware de autorización
2. ✅ Optimizar queries Prisma
3. ✅ Caché para queries frecuentes
4. ✅ Rate limiting
5. ✅ **Breadcrumbs para SEO**
6. ✅ **Focus management avanzado**
7. ✅ **ARIA live regions para actualizaciones dinámicas**

---

## 🚀 Plan de Implementación Sugerido

### Fase 1 (1-2 semanas) - Fundamentos
1. Implementar validación con Zod
2. Centralizar manejo de errores
3. Agregar logging estructurado
4. Crear tipos compartidos
5. **Metadata SEO básica por página**
6. **Skip links y landmarks semánticos**
7. **Atributos ARIA esenciales**

### Fase 2 (2-3 semanas) - Arquitectura
1. Extraer servicios de negocio
2. Implementar middleware de autorización
3. Optimizar queries Prisma
4. Agregar índices necesarios
5. **Sitemap.xml y robots.txt**
6. **Reemplazar alert()/confirm() con componentes accesibles**

### Fase 3 (2-3 semanas) - Optimización
1. Refactorizar componentes grandes
2. Implementar caché
3. Agregar rate limiting
4. Documentación de API
5. **Structured Data (JSON-LD)**
6. **Breadcrumbs para SEO**
7. **Focus management y navegación por teclado**

### Fase 4 (2-3 semanas) - SEO y Accesibilidad Avanzada
1. **Open Graph y Twitter Cards completos**
2. **Auditoría completa de accesibilidad**
3. **ARIA live regions para actualizaciones**
4. **Verificación de contraste de colores**
5. **Testing con screen readers**
6. **Optimización de imágenes (si aplica)**

### Fase 5 (Ongoing) - Calidad y Monitoreo
1. Tests unitarios
2. Tests de integración
3. Tests E2E (incluyendo tests de accesibilidad)
4. Monitoreo y observabilidad
5. **Monitoreo de SEO (Google Search Console)**
6. **Monitoreo de accesibilidad (Lighthouse CI)**

### Fase 6 (Futuro) - Microfrontends (Opcional)
1. **Evaluar necesidad real de microfrontends**
2. **Refactorizar componentes en módulos independientes**
3. **Configurar Module Federation o alternativa**
4. **Crear aplicación shell (host)**
5. **Migrar módulos gradualmente**
6. **Testing de integración entre microfrontends**
7. **CI/CD independiente por microfrontend**

---

## 🔍 SEO (Search Engine Optimization) - PRIORIDAD ALTA

### Problemas Identificados

1. **Metadata Genérica y Limitada**
   - Solo hay metadata básica en `layout.tsx`
   - No hay metadata específica por página
   - Falta Open Graph para redes sociales
   - No hay Twitter Cards
   - No hay metadata dinámica basada en contenido

2. **Falta de Estructura SEO**
   - No hay `sitemap.xml`
   - No hay `robots.txt`
   - No hay structured data (JSON-LD)
   - No hay canonical URLs

3. **Contenido No Optimizado**
   - Títulos de página genéricos
   - Falta de headings semánticos (h1, h2, h3)
   - No hay breadcrumbs
   - Contenido dinámico no indexable

### Soluciones Recomendadas

#### 1. **Metadata Dinámica por Página**

```typescript
// app/calendario/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendario de Clases | Almanaque',
  description: 'Consulta el calendario completo de clases de danza. Filtra por profesor, nivel, estilo y lugar.',
  openGraph: {
    title: 'Calendario de Clases | Almanaque',
    description: 'Consulta el calendario completo de clases de danza',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calendario de Clases | Almanaque',
    description: 'Consulta el calendario completo de clases de danza',
  },
}

// app/clases/[id]/page.tsx (nueva página para detalle de clase)
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const clase = await getClase(params.id)
  
  return {
    title: `${clase.titulo} | Almanaque`,
    description: clase.descripcion || `Clase de ${clase.estilo} - ${clase.nivel}`,
    openGraph: {
      title: clase.titulo,
      description: clase.descripcion,
      type: 'article',
    },
  }
}
```

#### 2. **Generar Sitemap Dinámico**

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://almanaque.com'
  
  // Obtener clases activas
  const clases = await prisma.clase.findMany({
    where: { activa: true },
    select: { id: true, updatedAt: true },
  })
  
  const claseUrls = clases.map((clase) => ({
    url: `${baseUrl}/clases/${clase.id}`,
    lastModified: clase.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/calendario`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...claseUrls,
  ]
}
```

#### 3. **Robots.txt**

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/login', '/registro'],
      },
    ],
    sitemap: `${process.env.NEXTAUTH_URL}/sitemap.xml`,
  }
}
```

#### 4. **Structured Data (JSON-LD)**

```typescript
// lib/seo/structured-data.ts
export function generateClassStructuredData(clase: Clase) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: clase.titulo,
    description: clase.descripcion,
    startDate: `${clase.fecha}T${clase.horaInicio}`,
    endDate: `${clase.fecha}T${clase.horaFin}`,
    location: {
      '@type': 'Place',
      name: clase.lugar,
    },
    organizer: {
      '@type': 'Person',
      name: clase.profesor.name,
    },
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
  }
}

// Uso en componente
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(generateClassStructuredData(clase))
  }}
/>
```

#### 5. **Breadcrumbs para Navegación SEO**

```typescript
// components/Breadcrumbs.tsx
export default function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm text-gray-600">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-2">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-primary-600">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

#### 6. **Headings Semánticos Mejorados**

```typescript
// Asegurar estructura jerárquica correcta
// app/calendario/page.tsx
<h1>Calendario de Clases</h1> {/* Solo uno por página */}
<h2>Filtros</h2>
<h2>Vista Semanal</h2>
<h3>Lunes, 15 de Enero</h3>
```

---

## ♿ ACCESIBILIDAD (A11y) - PRIORIDAD ALTA

### Problemas Identificados

1. **Falta de Atributos ARIA**
   - No hay `aria-label` en botones sin texto
   - No hay `aria-describedby` para ayuda contextual
   - No hay `aria-live` para actualizaciones dinámicas
   - Falta `aria-expanded` en elementos colapsables

2. **Navegación por Teclado**
   - No hay skip links
   - Falta de focus management
   - Uso de `div` como botones sin `role="button"` y `tabIndex`
   - No hay indicadores de focus visibles

3. **Elementos No Accesibles**
   - Uso de `alert()` y `confirm()` (no accesibles para screen readers)
   - Falta de labels en algunos inputs
   - Imágenes sin `alt` (si las hay)
   - Contraste de colores no verificado

4. **Estructura Semántica**
   - Falta de landmarks (`<main>`, `<nav>`, `<aside>`)
   - Uso excesivo de `<div>` en lugar de elementos semánticos
   - Falta de roles ARIA donde sea necesario

### Soluciones Recomendadas

#### 1. **Skip Links para Navegación Rápida**

```typescript
// components/SkipLink.tsx
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded"
    >
      Saltar al contenido principal
    </a>
  )
}

// app/layout.tsx
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

#### 2. **Reemplazar alert() y confirm() con Componentes Accesibles**

```typescript
// components/ConfirmDialog.tsx
import * as Dialog from '@radix-ui/react-dialog'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-lg"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <Dialog.Title id="dialog-title" className="text-lg font-semibold mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description id="dialog-description" className="mb-4">
            {description}
          </Dialog.Description>
          <div className="flex gap-2 justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 border rounded">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-primary-600 text-white rounded"
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

#### 3. **Mejorar Componentes con ARIA**

```typescript
// components/TarjetaClase.tsx (mejoras)
<article
  className="..."
  aria-labelledby={`clase-title-${clase.id}`}
  aria-describedby={`clase-description-${clase.id}`}
>
  <h3 id={`clase-title-${clase.id}`}>{clase.titulo}</h3>
  <p id={`clase-description-${clase.id}`} className="sr-only">
    Clase de {clase.estilo} nivel {clase.nivel} con {clase.profesor.name}
  </p>
  
  <button
    onClick={handleSubscribe}
    aria-label={estaSubscrito ? 'Desuscribirse de la clase' : 'Suscribirse a la clase'}
    aria-pressed={estaSubscrito}
    disabled={subscribiendo}
  >
    {estaSubscrito ? '✓ Suscrito' : 'Suscribirse'}
  </button>
  
  {inscripciones && (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">
        {inscripciones.cuposDisponibles} cupos disponibles de {inscripciones.capacidad} totales
      </span>
      <span aria-hidden="true">
        {inscripciones.inscritos}/{inscripciones.capacidad}
      </span>
    </div>
  )}
</article>
```

#### 4. **Mejorar Filtros con ARIA**

```typescript
// components/Filtros.tsx (mejoras)
<div
  role="search"
  aria-label="Filtros de búsqueda de clases"
  className="bg-white rounded-lg shadow-sm p-4 mb-6"
>
  <h2 className="text-lg font-semibold mb-4 text-gray-800">Filtros</h2>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
      <label
        htmlFor="filtro-profesor"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Profesor
      </label>
      <select
        id="filtro-profesor"
        value={filtroProfesor}
        onChange={(e) => onProfesorChange(e.target.value)}
        aria-label="Filtrar por profesor"
        className="..."
      >
        {/* opciones */}
      </select>
    </div>
    {/* ... más filtros */}
  </div>
  
  <button
    onClick={handleLimpiarFiltros}
    className="mt-4 text-sm text-primary-600 hover:text-primary-700"
    aria-label="Limpiar todos los filtros"
  >
    Limpiar filtros
  </button>
</div>
```

#### 5. **Landmarks Semánticos**

```typescript
// app/layout.tsx
<html lang="es">
  <body>
    <a href="#main-content" className="skip-link">Saltar al contenido</a>
    
    <header role="banner">
      <nav role="navigation" aria-label="Navegación principal">
        {/* Navegación */}
      </nav>
    </header>
    
    <main id="main-content" role="main" tabIndex={-1}>
      {children}
    </main>
    
    <footer role="contentinfo">
      {/* Footer */}
    </footer>
  </body>
</html>
```

#### 6. **Focus Management y Indicadores Visibles**

```css
/* app/globals.css - Agregar estilos de focus */
*:focus-visible {
  outline: 2px solid theme('colors.primary.600');
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid theme('colors.primary.600');
  outline-offset: 2px;
  border-radius: 4px;
}

/* Ocultar outline por defecto, mostrar solo en focus-visible */
*:focus:not(:focus-visible) {
  outline: none;
}
```

#### 7. **Regiones ARIA Live para Actualizaciones**

```typescript
// components/CalendarioClient.tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {mensajeActualizacion && <p>{mensajeActualizacion}</p>}
</div>

// Cuando se actualiza el calendario
setMensajeActualizacion(`Calendario actualizado. ${clases.length} clases encontradas.`)
setTimeout(() => setMensajeActualizacion(''), 3000)
```

#### 8. **Verificar Contraste de Colores**

```typescript
// Usar herramientas como:
// - WebAIM Contrast Checker
// - axe DevTools
// - Lighthouse

// Asegurar ratio mínimo de 4.5:1 para texto normal
// Asegurar ratio mínimo de 3:1 para texto grande

// Ejemplo de colores con buen contraste:
const colors = {
  text: '#111827', // gray-900 - ratio 15.8:1 sobre blanco
  textSecondary: '#4B5563', // gray-600 - ratio 7:1 sobre blanco
  primary: '#0284c7', // primary-600 - ratio 4.6:1 sobre blanco
}
```

#### 9. **Componente de Loading Accesible**

```typescript
// components/LoadingSpinner.tsx
export function LoadingSpinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex items-center justify-center p-4"
    >
      <svg
        className="animate-spin h-5 w-5 text-primary-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}
```

#### 10. **Formularios Accesibles**

```typescript
// components/RegistroForm.tsx (mejoras)
<form
  onSubmit={handleSubmit}
  aria-label="Formulario de registro"
  noValidate // Para manejar validación custom
>
  <div>
    <label htmlFor="email">
      Email <span aria-label="requerido">*</span>
    </label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      aria-invalid={errors.email ? 'true' : 'false'}
      aria-describedby={errors.email ? 'email-error' : undefined}
    />
    {errors.email && (
      <div
        id="email-error"
        role="alert"
        aria-live="polite"
        className="text-red-600 text-sm mt-1"
      >
        {errors.email}
      </div>
    )}
  </div>
</form>
```

### Herramientas de Validación

1. **Automáticas:**
   - `eslint-plugin-jsx-a11y`
   - `@axe-core/react`
   - Lighthouse (Chrome DevTools)
   - WAVE Browser Extension

2. **Manuales:**
   - Navegación solo con teclado
   - Screen reader (NVDA, JAWS, VoiceOver)
   - Verificación de contraste

### Instalación de Herramientas

```bash
npm install -D eslint-plugin-jsx-a11y @axe-core/react
```

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"]
}
```

---

## 🧩 MICROFRONTENDS - Preparación para Arquitectura Distribuida

### Estado Actual

**Evaluación:**
- ✅ Next.js 14 con App Router (compatible con microfrontends)
- ✅ TypeScript (facilita compartir tipos)
- ⚠️ Arquitectura monolítica actual
- ⚠️ Componentes no exportables como módulos independientes
- ⚠️ API routes acopladas a la aplicación
- ⚠️ Dependencias compartidas no aisladas

### ¿Por qué considerar Microfrontends?

**Beneficios:**
- 🔄 **Despliegue independiente** de módulos (calendario, admin, notificaciones)
- 👥 **Equipos autónomos** trabajando en paralelo
- 🚀 **Escalabilidad** horizontal por módulo
- 🔧 **Tecnologías heterogéneas** si es necesario
- 🛡️ **Aislamiento de errores** entre módulos

**Cuándo implementar:**
- Múltiples equipos trabajando en el mismo proyecto
- Necesidad de escalar módulos independientemente
- Diferentes ciclos de release por funcionalidad
- Integración con otros sistemas existentes

### Estrategias de Implementación

#### Opción 1: Module Federation (Recomendado para Next.js)

**Tecnología:** Webpack 5 Module Federation

**Ventajas:**
- ✅ Compartir código entre aplicaciones
- ✅ Carga dinámica de módulos
- ✅ Compatible con Next.js
- ✅ Hot Module Replacement (HMR)

**Configuración:**

```javascript
// next.config.js
const { NextFederationPlugin } = require('@module-federation/nextjs-mf')

const nextConfig = {
  webpack: (config, options) => {
    const { isServer } = options
    
    config.plugins.push(
      new NextFederationPlugin({
        name: 'almanaque',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          // Exponer componentes como microfrontends
          './Calendario': './components/VistaCalendario.tsx',
          './TarjetaClase': './components/TarjetaClase.tsx',
          './Filtros': './components/Filtros.tsx',
          './AdminPanel': './app/admin/AdminPanelClient.tsx',
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: '^18.2.0',
          },
          'react-dom': {
            singleton: true,
            requiredVersion: '^18.2.0',
          },
        },
      })
    )
    
    return config
  },
}

module.exports = nextConfig
```

**Estructura recomendada:**

```
almanaque/
├── microfrontends/
│   ├── calendario/          # Microfrontend del calendario
│   │   ├── components/
│   │   ├── hooks/
│   │   └── package.json
│   ├── admin/               # Microfrontend de administración
│   │   ├── components/
│   │   └── package.json
│   └── shared/              # Componentes compartidos
│       ├── ui/
│       └── types/
├── shell/                   # Aplicación shell (host)
│   └── app/
└── package.json
```

#### Opción 2: Next.js como Microfrontend Standalone

**Configuración:**

```javascript
// next.config.js - Para aplicación standalone
const nextConfig = {
  output: 'standalone',
  basePath: '/almanaque', // Prefijo para integración
  assetPrefix: process.env.ASSET_PREFIX || '',
  // Configurar CORS para permitir integración
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ]
  },
}
```

#### Opción 3: Componentes como Librería NPM

**Estructura:**

```typescript
// packages/almanaque-calendario/src/index.ts
export { default as VistaCalendario } from './components/VistaCalendario'
export { default as TarjetaClase } from './components/TarjetaClase'
export { default as Filtros } from './components/Filtros'
export * from './types'
export * from './hooks'

// packages/almanaque-calendario/package.json
{
  "name": "@almanaque/calendario",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

### Preparación del Proyecto Actual

#### 1. **Separar Componentes en Módulos Independientes**

```typescript
// components/calendario/index.ts
export { default as VistaCalendario } from './VistaCalendario'
export { default as VistaDia } from './VistaDia'
export { default as VistaSemana } from './VistaSemana'
export * from './types'
export * from './hooks'

// components/admin/index.ts
export { default as AdminPanel } from './AdminPanel'
export { default as ClaseForm } from './ClaseForm'
export * from './types'
```

#### 2. **Crear API Gateway o BFF (Backend for Frontend)**

```typescript
// lib/api-gateway.ts
export class ApiGateway {
  private baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  async getClases(filtros: FiltrosClase) {
    const response = await fetch(`${this.baseUrl}/api/clases`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    return response.json()
  }
  
  // Métodos para otros endpoints
}

// Uso en microfrontend
const apiGateway = new ApiGateway(process.env.API_BASE_URL || '')
```

#### 3. **Aislar Estado y Contexto**

```typescript
// lib/context/CalendarioContext.tsx
'use client'

import { createContext, useContext } from 'react'

interface CalendarioContextType {
  clases: Clase[]
  filtros: FiltrosClase
  setFiltros: (filtros: FiltrosClase) => void
}

export const CalendarioContext = createContext<CalendarioContextType | null>(null)

export function CalendarioProvider({ children, apiUrl }: { 
  children: React.ReactNode
  apiUrl?: string 
}) {
  // Lógica del contexto
  return (
    <CalendarioContext.Provider value={value}>
      {children}
    </CalendarioContext.Provider>
  )
}

// Uso independiente del microfrontend
export function useCalendario() {
  const context = useContext(CalendarioContext)
  if (!context) {
    throw new Error('useCalendario must be used within CalendarioProvider')
  }
  return context
}
```

#### 4. **Configurar Build para Múltiples Salidas**

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "build:standalone": "next build && next export",
    "build:microfrontend": "next build --output=standalone",
    "build:library": "tsc && rollup -c"
  }
}
```

#### 5. **Definir Contratos de API y Tipos Compartidos**

```typescript
// packages/shared-types/src/index.ts
// Tipos compartidos entre microfrontends
export interface Clase {
  id: string
  titulo: string
  // ... resto de campos
}

export interface FiltrosClase {
  profesor?: string
  nivel?: Nivel
  estilo?: Estilo
  lugar?: string
}

// Contrato de API
export interface ClaseApi {
  getClases(filtros: FiltrosClase): Promise<Clase[]>
  createClase(data: CreateClaseDto): Promise<Clase>
  updateClase(id: string, data: UpdateClaseDto): Promise<Clase>
  deleteClase(id: string): Promise<void>
}
```

#### 6. **Configurar Variables de Entorno para Microfrontends**

```bash
# .env.microfrontend
MICROFRONTEND_NAME=almanaque-calendario
MICROFRONTEND_VERSION=1.0.0
API_BASE_URL=http://localhost:3000
SHARED_DEPENDENCIES_URL=http://localhost:3001
```

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────┐
│           Shell Application (Host)              │
│  - Routing                                      │
│  - Layout principal                             │
│  - Autenticación                                │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼───┐ ┌─────▼─────┐ ┌──▼──────────┐
│ Calendario│ │   Admin   │ │ Notificac.  │
│  (MFE)    │ │   (MFE)   │ │   (MFE)     │
└───────────┘ └───────────┘ └─────────────┘
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────▼───────────┐
        │    API Gateway / BFF   │
        │  - /api/clases          │
        │  - /api/admin           │
        │  - /api/notificaciones  │
        └────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │    Backend Services    │
        │  - Prisma              │
        │  - NextAuth            │
        └────────────────────────┘
```

### Checklist de Preparación

#### Fase 1: Refactorización (Preparación)
- [ ] Separar componentes en módulos independientes
- [ ] Crear estructura de carpetas para microfrontends
- [ ] Extraer tipos compartidos a paquete separado
- [ ] Aislar lógica de estado en contextos
- [ ] Documentar contratos de API

#### Fase 2: Configuración Técnica
- [ ] Configurar Module Federation o alternativa
- [ ] Configurar build para múltiples salidas
- [ ] Implementar API Gateway/BFF
- [ ] Configurar CORS y headers necesarios
- [ ] Setup de monorepo (si aplica)

#### Fase 3: Implementación
- [ ] Crear aplicación shell (host)
- [ ] Migrar módulo de calendario
- [ ] Migrar módulo de administración
- [ ] Testing de integración entre módulos
- [ ] Documentación de despliegue

#### Fase 4: Optimización
- [ ] Lazy loading de microfrontends
- [ ] Code splitting optimizado
- [ ] Caché de módulos compartidos
- [ ] Monitoreo y observabilidad
- [ ] CI/CD para cada microfrontend

### Herramientas Recomendadas

1. **Module Federation:**
   - `@module-federation/nextjs-mf` - Para Next.js
   - `@module-federation/runtime` - Runtime utilities

2. **Monorepo (Opcional):**
   - Turborepo
   - Nx
   - pnpm workspaces

3. **Build Tools:**
   - Rollup (para librerías)
   - Webpack 5 (Module Federation)
   - esbuild (build rápido)

4. **Testing:**
   - Playwright (E2E entre microfrontends)
   - Jest (unit tests)
   - MSW (mock API)

### Consideraciones Importantes

⚠️ **Desafíos:**
- Complejidad inicial de setup
- Gestión de versiones de dependencias compartidas
- Debugging más complejo
- Overhead de red (múltiples bundles)
- Sincronización de estado entre módulos

✅ **Mejores Prácticas:**
- Mantener dependencias compartidas al mínimo
- Versionar APIs y contratos
- Documentar claramente las interfaces
- Implementar error boundaries por módulo
- Usar feature flags para despliegues graduales

### Ejemplo de Integración

```typescript
// shell-app/app/calendario/page.tsx
import dynamic from 'next/dynamic'

// Cargar microfrontend dinámicamente
const CalendarioMF = dynamic(
  () => import('@almanaque/calendario'),
  { 
    ssr: false,
    loading: () => <div>Cargando calendario...</div>
  }
)

export default function CalendarioPage() {
  return (
    <CalendarioMF
      apiUrl={process.env.API_BASE_URL}
      theme="default"
      onClaseClick={(clase) => {
        // Manejar eventos del microfrontend
      }}
    />
  )
}
```

---

## 📝 Notas Adicionales

- **Base de datos:** Considerar migrar de SQLite a PostgreSQL para producción
- **Monitoreo:** Implementar Sentry o similar para tracking de errores
- **CI/CD:** Agregar checks de calidad (linting, tests) en el pipeline
- **Performance:** Considerar React Server Components donde sea apropiado
- **Seguridad:** Revisar y fortalecer validación de inputs, sanitización
- **Microfrontends:** El proyecto está preparado para migrar a arquitectura de microfrontends si es necesario. Ver sección dedicada para detalles.

---

**Última actualización:** 2025-01-16

---

## 📊 Resumen de Mejoras SEO y Accesibilidad

### 🔍 SEO - Checklist de Implementación

- [ ] Metadata dinámica por página
- [ ] Open Graph y Twitter Cards
- [ ] Sitemap.xml dinámico
- [ ] Robots.txt configurado
- [ ] Structured Data (JSON-LD)
- [ ] Breadcrumbs semánticos
- [ ] Headings jerárquicos correctos
- [ ] Canonical URLs
- [ ] Optimización de imágenes (si aplica)
- [ ] Meta descriptions únicas por página

### ♿ Accesibilidad - Checklist de Implementación

- [ ] Skip links implementados
- [ ] Atributos ARIA en componentes interactivos
- [ ] Navegación por teclado funcional
- [ ] Reemplazar alert()/confirm() con componentes accesibles
- [ ] Labels en todos los inputs
- [ ] Landmarks semánticos (main, nav, header, footer)
- [ ] Focus visible y management
- [ ] Regiones ARIA live para actualizaciones
- [ ] Contraste de colores verificado (mínimo 4.5:1)
- [ ] Screen reader testing
- [ ] ESLint con jsx-a11y configurado

