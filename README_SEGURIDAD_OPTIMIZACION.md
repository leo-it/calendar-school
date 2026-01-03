# 🔒 Seguridad y Optimizaciones

Este documento detalla las medidas de seguridad y optimizaciones implementadas en Almanaque de Clases.

## 🔐 Seguridad

### Validación de Datos

- **Zod Schemas**: Validación estricta de todos los inputs usando esquemas de Zod
  - Validación de tipos, formatos y rangos
  - Mensajes de error descriptivos
  - Prevención de inyección de datos maliciosos

- **Sanitización**: Limpieza de strings para prevenir XSS
  - Remoción de caracteres peligrosos (`<`, `>`)
  - Limite de longitud de strings
  - Validación de formatos (email, teléfono, URLs)

### Headers de Seguridad

Implementados en `middleware.ts` y aplicados globalmente:

- `X-Content-Type-Options: nosniff` - Previene MIME type sniffing
- `X-Frame-Options: DENY` - Previene clickjacking
- `X-XSS-Protection: 1; mode=block` - Protección XSS del navegador
- `Referrer-Policy: strict-origin-when-cross-origin` - Control de referrer
- `Strict-Transport-Security` - Fuerza HTTPS (en producción)
- `Content-Security-Policy` - Restringe recursos cargados

### Autenticación y Autorización

- **NextAuth.js**: Manejo seguro de sesiones
  - JWT tokens con expiración
  - Hash de contraseñas con bcrypt (10 rounds)
  - Validación de roles en cada endpoint

- **Autorización por Roles**:
  - `ADMIN`: Acceso completo
  - `PROFESOR`: Solo su escuela
  - `ESTUDIANTE`: Solo lectura de su escuela

- **Validación de Escuela**: Todos los usuarios solo pueden acceder a datos de su escuela asignada

### Protección contra Ataques Comunes

1. **SQL Injection**: 
   - Prisma ORM previene inyección SQL automáticamente
   - Parámetros siempre escapados

2. **XSS (Cross-Site Scripting)**:
   - Sanitización de inputs
   - CSP headers
   - React escapa automáticamente

3. **CSRF (Cross-Site Request Forgery)**:
   - NextAuth incluye protección CSRF
   - Tokens de sesión únicos

4. **Rate Limiting**:
   - Implementación básica en `lib/security.ts`
   - Recomendado: Usar Redis en producción para rate limiting distribuido

### Contraseñas

- Mínimo 8 caracteres
- Requiere mayúsculas, minúsculas y números
- Hash con bcrypt (10 rounds)
- Nunca se exponen en logs o respuestas

## ⚡ Optimizaciones de Rendimiento

### Base de Datos

**Índices Agregados** (en `prisma/schema.prisma`):

```prisma
model Clase {
  @@index([escuelaId, activa])      // Para filtrar clases activas por escuela
  @@index([diaSemana, activa])     // Para buscar clases por día
  @@index([profesorId])             // Para buscar clases por profesor
}

model User {
  @@index([escuelaId, role])        // Para filtrar usuarios por escuela y rol
  @@index([email])                  // Para búsquedas por email (ya tiene @unique)
}
```

**Beneficios**:
- Queries hasta 10x más rápidas en tablas grandes
- Menor uso de CPU en el servidor de BD
- Mejor escalabilidad

### Next.js

**Configuración Optimizada** (`next.config.js`):

- `compress: true` - Compresión gzip automática
- `poweredByHeader: false` - Oculta información del servidor
- Optimización de imágenes (AVIF, WebP)
- Device sizes optimizados

### Service Worker (PWA)

- Cache de recursos estáticos
- Estrategia "Network First" para contenido dinámico
- Funcionamiento offline básico
- Actualizaciones automáticas

### Lazy Loading

- Componentes cargados bajo demanda
- Imágenes optimizadas con Next.js Image
- Code splitting automático

## 📱 Progressive Web App (PWA)

### Características Implementadas

1. **Manifest.json**:
   - Nombre y descripción de la app
   - Iconos para diferentes tamaños
   - Tema y colores
   - Modo standalone

2. **Service Worker**:
   - Cache de recursos estáticos
   - Funcionamiento offline básico
   - Actualizaciones automáticas

3. **Instalación**:
   - Banner automático en navegadores compatibles
   - Instalable desde el navegador (sin stores)
   - Funciona como app nativa

### Cómo Instalar

**Android (Chrome/Edge)**:
1. Abrir la web en el navegador
2. Aparece banner "Agregar a la pantalla de inicio"
3. Tocar "Agregar"
4. La app aparece como ícono en la pantalla

**iOS (Safari)**:
1. Abrir la web en Safari
2. Tocar el botón de compartir (□↑)
3. Seleccionar "Agregar a pantalla de inicio"
4. La app aparece como ícono en la pantalla

### Iconos

**Nota**: Los iconos actuales son placeholders. Para producción:

1. Crear iconos en tamaños:
   - 192x192px (`public/icon-192x192.png`)
   - 512x512px (`public/icon-512x512.png`)

2. Usar herramientas como:
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

## 📊 Monitoreo y Logging

### Desarrollo

- Logs detallados de Prisma queries
- Errores con stack traces
- Validación de datos visible

### Producción

- Solo errores críticos en logs
- Detalles de errores ocultos al usuario
- Recomendado: Integrar Sentry o similar

## 🚀 Próximas Mejoras Recomendadas

1. **Rate Limiting Distribuido**:
   - Implementar con Redis
   - Límites por IP y usuario

2. **Caché de Queries**:
   - Usar `unstable_cache` de Next.js
   - Cachear listas de profesores, escuelas

3. **Monitoreo**:
   - Integrar Sentry para errores
   - Métricas con Prometheus/Grafana

4. **Testing de Seguridad**:
   - Tests automatizados de validación
   - Penetration testing periódico

5. **HTTPS Obligatorio**:
   - Configurar en producción
   - Certificados SSL/TLS

## 📝 Checklist de Seguridad

- [x] Validación de inputs con Zod
- [x] Sanitización de strings
- [x] Headers de seguridad
- [x] Autenticación con NextAuth
- [x] Autorización por roles
- [x] Hash de contraseñas
- [x] Protección SQL Injection (Prisma)
- [x] Protección XSS
- [x] Rate limiting básico
- [ ] Rate limiting distribuido (Redis)
- [ ] Tests de seguridad automatizados
- [ ] Auditoría de seguridad periódica

## 🔗 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security](https://www.prisma.io/docs/guides/security)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

